/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/services/subscriptionService.ts
// WebSocket subscriptions via connection.onLogs() for real-time message detection.
// Includes auto-reconnect with exponential backoff, health checks, and polling fallback.

import {PublicKey} from '@solana/web3.js';
import {getConnection} from '../../../core/solana/connection';

type LogCallback = () => void;

const MEMO_PROGRAM_ID_STR = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const MAX_RECONNECT_ATTEMPTS = 10;
const HEALTH_CHECK_INTERVAL = 30_000; // 30 seconds
const FALLBACK_POLL_INTERVAL = 5_000; // 5 seconds (only used after WS failure)

// --- State ---
let activeSubscriptionIds: number[] = [];
let isSubscribed = false;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;
let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;

// Saved params for reconnection
let savedMyAddress: string | null = null;
let savedPeerAddress: string | null = null;
let savedCallback: LogCallback | null = null;

/**
 * Subscribe to on-chain logs for both our address and the peer's address.
 * When a Memo transaction is detected, fires the callback so the store
 * can fetch and decrypt the new message.
 *
 * Includes auto-reconnect with exponential backoff and health monitoring.
 */
export async function subscribeToConversation(
  myAddress: string,
  peerAddress: string,
  onNewTransaction: LogCallback,
): Promise<void> {
  // Save params for reconnection
  savedMyAddress = myAddress;
  savedPeerAddress = peerAddress;
  savedCallback = onNewTransaction;

  // Clean up any existing subscriptions first
  await cleanupSubscriptions();

  await setupSubscriptions();
}

/** Internal: set up the actual WebSocket subscriptions */
async function setupSubscriptions(): Promise<void> {
  if (!savedMyAddress || !savedPeerAddress || !savedCallback) return;

  const myAddress = savedMyAddress;
  const peerAddress = savedPeerAddress;
  const onNewTransaction = savedCallback;

  // Debounce: avoid firing callback multiple times for the same tx
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedCallback = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onNewTransaction();
    }, 1500);
  };

  try {
    const connection = await getConnection();

    // Subscribe to logs that mention the Memo program for our address
    const mySubId = connection.onLogs(
      new PublicKey(myAddress),
      logs => {
        if (logs.err) return;
        const hasMemo = logs.logs.some(
          log =>
            log.includes(MEMO_PROGRAM_ID_STR) ||
            log.includes('Program log: Memo'),
        );
        if (hasMemo) {
          debouncedCallback();
        }
      },
      'confirmed',
    );
    activeSubscriptionIds.push(mySubId);

    // Subscribe to logs for the peer's address
    const peerSubId = connection.onLogs(
      new PublicKey(peerAddress),
      logs => {
        if (logs.err) return;
        const hasMemo = logs.logs.some(
          log =>
            log.includes(MEMO_PROGRAM_ID_STR) ||
            log.includes('Program log: Memo'),
        );
        if (hasMemo) {
          debouncedCallback();
        }
      },
      'confirmed',
    );
    activeSubscriptionIds.push(peerSubId);

    isSubscribed = true;
    reconnectAttempts = 0;

    // Stop fallback polling if WS is working
    stopFallbackPolling();

    // Start health monitoring
    startHealthCheck();
  } catch (err) {
    console.warn('[WS] Subscription setup failed:', err);
    scheduleReconnect();
  }
}

/** Monitor WebSocket health and reconnect if dead */
function startHealthCheck(): void {
  stopHealthCheck();

  healthCheckTimer = setInterval(async () => {
    try {
      const connection = await getConnection();
      // Access internal WebSocket state to check if connection is alive
      const ws = (connection as any)?._rpcWebSocket?._ws;
      if (ws && ws.readyState !== 1 /* WebSocket.OPEN */) {
        console.warn('[WS] WebSocket not open (state:', ws.readyState, '), reconnecting');
        await cleanupSubscriptions();
        scheduleReconnect();
      }
    } catch {
      // Can't check state — try reconnecting to be safe
      await cleanupSubscriptions();
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
  if (reconnectTimer) return; // Already scheduled

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[WS] Max reconnect attempts reached, falling back to polling');
    startFallbackPolling();
    return;
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30_000);
  reconnectAttempts++;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await setupSubscriptions();
  }, delay);
}

/** Start polling as a fallback when WebSocket is completely dead */
function startFallbackPolling(): void {
  if (fallbackPollTimer) return; // Already polling

  fallbackPollTimer = setInterval(() => {
    savedCallback?.();
  }, FALLBACK_POLL_INTERVAL);
}

function stopFallbackPolling(): void {
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer);
    fallbackPollTimer = null;
  }
}

/** Clean up WebSocket subscriptions without clearing saved params */
async function cleanupSubscriptions(): Promise<void> {
  stopHealthCheck();

  if (activeSubscriptionIds.length > 0) {
    try {
      const connection = await getConnection();
      for (const subId of activeSubscriptionIds) {
        try {
          connection.removeOnLogsListener(subId);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch {
      // Connection unavailable, subscriptions are already dead
    }
  }

  activeSubscriptionIds = [];
  isSubscribed = false;
}

/** Remove all subscriptions and stop all timers. Full teardown. */
export async function unsubscribeAll(): Promise<void> {
  await cleanupSubscriptions();
  stopFallbackPolling();

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  reconnectAttempts = 0;
  savedMyAddress = null;
  savedPeerAddress = null;
  savedCallback = null;
}

/** Attempt to reconnect after app comes to foreground */
export async function reconnectIfNeeded(): Promise<void> {
  if (!savedMyAddress || !savedPeerAddress || !savedCallback) return;

  // If already connected, just do a health check
  if (isSubscribed) {
    try {
      const connection = await getConnection();
      const ws = (connection as any)?._rpcWebSocket?._ws;
      if (ws && ws.readyState === 1) {
        // WS is healthy, just trigger a manual fetch for missed messages
        savedCallback();
        return;
      }
    } catch {
      // Fall through to reconnect
    }
  }

  // Reconnect
  reconnectAttempts = 0;
  await cleanupSubscriptions();
  stopFallbackPolling();
  await setupSubscriptions();

  // Also trigger a fetch for any messages missed while backgrounded
  savedCallback?.();
}

export function isActivelySubscribed(): boolean {
  return isSubscribed;
}
