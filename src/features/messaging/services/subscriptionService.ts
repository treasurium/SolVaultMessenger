// src/features/messaging/services/subscriptionService.ts
// WebSocket subscriptions via connection.onLogs() for real-time message detection.

import {PublicKey} from '@solana/web3.js';
import {getConnection} from '../../../core/solana/connection';

type LogCallback = () => void;

const MEMO_PROGRAM_ID_STR = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

let activeSubscriptionIds: number[] = [];
let isSubscribed = false;

/**
 * Subscribe to on-chain logs for both our address and the peer's address.
 * When a Memo transaction is detected, fires the callback so the store
 * can fetch and decrypt the new message.
 */
export async function subscribeToConversation(
  myAddress: string,
  peerAddress: string,
  onNewTransaction: LogCallback,
): Promise<void> {
  // Clean up any existing subscriptions first
  await unsubscribeAll();

  const connection = await getConnection();

  // Debounce: avoid firing callback multiple times for the same tx
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedCallback = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onNewTransaction();
    }, 1500); // Wait 1.5s after last log to let tx finalize
  };

  try {
    // Subscribe to logs that mention the Memo program for our address
    const mySubId = connection.onLogs(
      new PublicKey(myAddress),
      (logs) => {
        if (logs.err) return;
        const hasMemo = logs.logs.some(
          (log) =>
            log.includes(MEMO_PROGRAM_ID_STR) ||
            log.includes('Program log: Memo'),
        );
        if (hasMemo) {
          console.log('[WS] Memo tx detected on my address:', logs.signature.slice(0, 12));
          debouncedCallback();
        }
      },
      'confirmed',
    );
    activeSubscriptionIds.push(mySubId);

    // Subscribe to logs for the peer's address
    const peerSubId = connection.onLogs(
      new PublicKey(peerAddress),
      (logs) => {
        if (logs.err) return;
        const hasMemo = logs.logs.some(
          (log) =>
            log.includes(MEMO_PROGRAM_ID_STR) ||
            log.includes('Program log: Memo'),
        );
        if (hasMemo) {
          console.log('[WS] Memo tx detected on peer address:', logs.signature.slice(0, 12));
          debouncedCallback();
        }
      },
      'confirmed',
    );
    activeSubscriptionIds.push(peerSubId);

    isSubscribed = true;
    console.log(`[WS] Subscribed to conversation (my: ${mySubId}, peer: ${peerSubId})`);
  } catch (err) {
    console.warn('[WS] Failed to subscribe:', err);
    // Subscriptions are best-effort; polling fallback will cover
  }
}

/** Remove all active WebSocket subscriptions */
export async function unsubscribeAll(): Promise<void> {
  if (activeSubscriptionIds.length === 0) return;

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

  activeSubscriptionIds = [];
  isSubscribed = false;
  console.log('[WS] Unsubscribed all');
}

export function isActivelySubscribed(): boolean {
  return isSubscribed;
}
