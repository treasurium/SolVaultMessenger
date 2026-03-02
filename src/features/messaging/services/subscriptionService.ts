/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/services/subscriptionService.ts
// Global WebSocket listener on the user's own wallet address.
// Detects ALL incoming memo transactions in real-time across every conversation.
// Includes auto-reconnect with exponential backoff, health checks, and polling fallback.

import {PublicKey} from '@solana/web3.js';
import {getConnection} from '../../../core/solana/connection';

type NewMessageCallback = (txSignature: string) => void;

const MEMO_PROGRAM_ID_STR = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const MAX_RECONNECT_ATTEMPTS = 10;
const HEALTH_CHECK_INTERVAL = 30_000; // 30 seconds
const FALLBACK_POLL_INTERVAL = 5_000; // 5 seconds (only used after WS failure)

// --- State ---
let activeSubscriptionId: number | null = null;
let isSubscribed = false;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;
let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;

// Saved params for reconnection
let savedMyAddress: string | null = null;
let savedCallback: NewMessageCallback | null = null;

// Track processed signatures to avoid duplicates
const processedSignatures = new Set<string>();
const MAX_PROCESSED_CACHE = 500;

function addProcessedSignature(sig: string): void {
  processedSignatures.add(sig);
  // Evict oldest entries if cache grows too large
  if (processedSignatures.size > MAX_PROCESSED_CACHE) {
    const iterator = processedSignatures.values();
    const oldest = iterator.next().value;
    if (oldest) processedSignatures.delete(oldest);
  }
}

/**
 * Start a global WebSocket listener on the user's own wallet address.
 * Fires the callback with the tx signature whenever a new memo transaction
 * is detected that involves the user's wallet. This works because:
 *
 * 1. Outgoing messages: user is the signer/fee-payer
 * 2. Incoming messages: recipient address is included via SystemProgram.transfer(0)
 *
 * The callback receives the transaction signature so the caller can fetch,
 * decrypt, and store the message.
 */
export async function startGlobalListener(
  myAddress: string,
  onNewMemoTransaction: NewMessageCallback,
): Promise<void> {
  // Save params for reconnection
  savedMyAddress = myAddress;
  savedCallback = onNewMemoTransaction;

  // Clean up any existing subscription first
  await cleanupSubscription();

  await setupSubscription();
}

/** Internal: set up the actual WebSocket subscription */
async function setupSubscription(): Promise<void> {
  if (!savedMyAddress || !savedCallback) return;

  const myAddress = savedMyAddress;
  const onNewMemoTransaction = savedCallback;

  try {
    const connection = await getConnection();

    // Subscribe to logs for our own wallet address.
    // This fires for every transaction that involves our address as an account key.
    const subId = connection.onLogs(
      new PublicKey(myAddress),
      logs => {
        if (logs.err) return;

        // Check if this transaction involves the Memo program
        const hasMemo = logs.logs.some(
          log =>
            log.includes(MEMO_PROGRAM_ID_STR) ||
            log.includes('Program log: Memo'),
        );

        if (hasMemo) {
          const sig = logs.signature;
          if (!processedSignatures.has(sig)) {
            addProcessedSignature(sig);
            onNewMemoTransaction(sig);
          }
        }
      },
      'confirmed',
    );

    activeSubscriptionId = subId;
    isSubscribed = true;
    reconnectAttempts = 0;

    // Stop fallback polling if WS is working
    stopFallbackPolling();

    // Start health monitoring
    startHealthCheck();

    console.log('[WS] Global listener started for', myAddress.slice(0, 8) + '...');
  } catch (err) {
    console.warn('[WS] Global listener setup failed:', err);
    scheduleReconnect();
  }
}

/** Monitor WebSocket health and reconnect if dead */
function startHealthCheck(): void {
  stopHealthCheck();

  healthCheckTimer = setInterval(async () => {
    try {
      const connection = await getConnection();
      const ws = (connection as any)?._rpcWebSocket?._ws;
      if (ws && ws.readyState !== 1 /* WebSocket.OPEN */) {
        console.warn('[WS] WebSocket not open (state:', ws.readyState, '), reconnecting');
        await cleanupSubscription();
        scheduleReconnect();
      }
    } catch {
      await cleanupSubscription();
      scheduleReconnect();
    }
  }, HEALTH_CHECK_INTERVAL);
}

function stopHealthCheck(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

/** Schedule a reconnect with exponential backoff */
function scheduleReconnect(): void {
  if (reconnectTimer) return;

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[WS] Max reconnect attempts reached, falling back to polling');
    startFallbackPolling();
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30_000);
  reconnectAttempts++;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await setupSubscription();
  }, delay);
}

/** Start polling as a fallback when WebSocket is completely dead */
function startFallbackPolling(): void {
  if (fallbackPollTimer) return;

  fallbackPollTimer = setInterval(() => {
    // Fire callback with empty string to signal "do a full poll"
    savedCallback?.('');
  }, FALLBACK_POLL_INTERVAL);
}

function stopFallbackPolling(): void {
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer);
    fallbackPollTimer = null;
  }
}

/** Clean up WebSocket subscription without clearing saved params */
async function cleanupSubscription(): Promise<void> {
  stopHealthCheck();

  if (activeSubscriptionId !== null) {
    try {
      const connection = await getConnection();
      try {
        connection.removeOnLogsListener(activeSubscriptionId);
      } catch {
        // Ignore cleanup errors
      }
    } catch {
      // Connection unavailable, subscription is already dead
    }
  }

  activeSubscriptionId = null;
  isSubscribed = false;
}

/** Stop the global listener completely. Full teardown. */
export async function stopGlobalListener(): Promise<void> {
  await cleanupSubscription();
  stopFallbackPolling();

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  reconnectAttempts = 0;
  savedMyAddress = null;
  savedCallback = null;
  processedSignatures.clear();
}

/** Reconnect after app comes to foreground. Returns true if a poll is needed. */
export async function reconnectIfNeeded(): Promise<boolean> {
  if (!savedMyAddress || !savedCallback) return false;

  // If already connected, check health
  if (isSubscribed) {
    try {
      const connection = await getConnection();
      const ws = (connection as any)?._rpcWebSocket?._ws;
      if (ws && ws.readyState === 1) {
        // WS is healthy, caller should still poll for missed messages
        return true;
      }
    } catch {
      // Fall through to reconnect
    }
  }

  // Reconnect
  reconnectAttempts = 0;
  await cleanupSubscription();
  stopFallbackPolling();
  await setupSubscription();

  return true; // Caller should poll for missed messages
}

export function isActivelySubscribed(): boolean {
  return isSubscribed;
}
