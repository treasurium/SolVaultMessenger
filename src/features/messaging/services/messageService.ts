/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/services/messageService.ts
// End-to-end encrypted messaging via Solana Memo transactions.
// Messages are fetched directly from on-chain transaction history.

import {PublicKey} from '@solana/web3.js';
import {getConnection} from '../../../core/solana/connection';
import {
  encryptMessage,
  decryptMessage,
  decryptOwnMessage,
  extractRecipientFromPayload,
  getPayloadType,
  createReadReceipt,
  decryptReadReceipt,
} from './encryptionService';
import {sendEncryptedMemoTransaction} from './memoTransactionService';
import {getWalletKeypair} from '../../wallet/services/keypairService';
import {
  insertMessage,
  upsertConversation,
  getMessageByTxSignature,
  getUnreadMessagesForConversation,
  updateMessageReadStatus,
  getReadReceiptSentSignatures,
  markReadReceiptSent,
  type StoredMessage,
} from '../../../core/storage/database';
import {secureRetrieve, secureStore} from '../../../core/storage/secureStorage';

const MEMO_PROGRAM_ID_STR = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const LAST_SIGNATURE_KEY = 'solvault_last_processed_sig';

/** Send an encrypted message on-chain */
export async function sendMessage(
  recipientAddress: string,
  plaintext: string,
): Promise<{txSignature: string; messageId: string}> {
  const walletKeypair = await getWalletKeypair();
  if (!walletKeypair) {
    throw new Error('Wallet not initialized');
  }

  const recipientPubKey = new PublicKey(recipientAddress).toBytes();

  // Encrypt using Ed25519->X25519 conversion — only nonce+ciphertext on-chain
  const {serialized, timestamp} = encryptMessage(
    plaintext,
    walletKeypair.secretKey,
    recipientPubKey,
  );

  // Send on-chain with recipient as account key
  const txSignature = await sendEncryptedMemoTransaction(
    walletKeypair,
    recipientAddress,
    serialized,
  );

  // Store locally
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Detect payment messages
  let messageType: 'text' | 'payment' = 'text';
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed.type === 'payment') messageType = 'payment';
  } catch { /* text message */ }

  const storedMessage: StoredMessage = {
    id: messageId,
    conversation_id: recipientAddress,
    sender_address: walletKeypair.publicKey.toString(),
    recipient_address: recipientAddress,
    plaintext,
    tx_signature: txSignature,
    timestamp,
    status: 'confirmed',
    read_status: 'sent',
    message_type: messageType,
  };

  await insertMessage(storedMessage);

  await upsertConversation({
    id: recipientAddress,
    peer_address: recipientAddress,
    peer_name: null,
    peer_enc_pubkey: null,
    last_message_text: plaintext,
    last_message_time: timestamp,
  });

  return {txSignature, messageId};
}

/** Result from processing a single transaction */
export interface ProcessedTxResult {
  peerAddress: string;
  type: 'incoming_message' | 'outgoing_message' | 'read_receipt';
}

/**
 * Process a single transaction by signature.
 * Called by the global WebSocket listener when a new memo tx is detected.
 * Returns the peer address and type if successfully processed (for UI refresh + receipts).
 */
export async function processTransaction(
  signature: string,
): Promise<ProcessedTxResult | null> {
  if (!signature) return null;

  const walletKeypair = await getWalletKeypair();
  if (!walletKeypair) return null;

  // Skip if already processed
  const existing = await getMessageByTxSignature(signature);
  if (existing) return null;

  const connection = await getConnection();
  const myAddress = walletKeypair.publicKey.toString();
  const myPubKeyBytes = walletKeypair.publicKey.toBytes();

  try {
    const txResponse = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!txResponse) return null;

    const memoData = extractMemoFromTransaction(txResponse);
    if (!memoData) return null;

    const payloadType = getPayloadType(memoData);
    const accountKeys = getAccountKeysFromTx(txResponse);
    const senderAddress = accountKeys[0]; // fee payer = sender
    const blockTime = txResponse.blockTime ?? 0;

    if (payloadType === 'message') {
      try {
        const embeddedRecipient = extractRecipientFromPayload(memoData);
        const embeddedRecipientAddress = new PublicKey(embeddedRecipient).toString();

        // Case 1: Someone sent a message TO us
        if (embeddedRecipientAddress === myAddress && senderAddress !== myAddress) {
          const senderPubKeyBytes = new PublicKey(senderAddress).toBytes();
          const plaintext = decryptMessage(
            memoData,
            walletKeypair.secretKey,
            senderPubKeyBytes,
          );

          await storeDecryptedMessage(
            signature, blockTime, senderAddress,
            senderAddress, myAddress, plaintext, false,
          );

          // Save as last processed signature
          await saveLastProcessedSignature(signature);

          return {peerAddress: senderAddress, type: 'incoming_message'};
        }

        // Case 2: We sent a message (e.g. from another device or just confirmed)
        if (senderAddress === myAddress && embeddedRecipientAddress !== myAddress) {
          const recipientPubKeyBytes = new PublicKey(embeddedRecipientAddress).toBytes();
          const plaintext = decryptOwnMessage(
            memoData,
            walletKeypair.secretKey,
            recipientPubKeyBytes,
          );

          await storeDecryptedMessage(
            signature, blockTime, embeddedRecipientAddress,
            myAddress, embeddedRecipientAddress, plaintext, true,
          );

          await saveLastProcessedSignature(signature);

          return {peerAddress: embeddedRecipientAddress, type: 'outgoing_message'};
        }
      } catch {
        return null;
      }
    } else if (payloadType === 'read_receipt' && senderAddress !== myAddress) {
      try {
        const senderPubKeyBytes = new PublicKey(senderAddress).toBytes();
        const ackedSignatures = decryptReadReceipt(
          memoData,
          walletKeypair.secretKey,
          senderPubKeyBytes,
        );
        for (const ackedSig of ackedSignatures) {
          await updateMessageReadStatus(ackedSig, 'read');
        }
        await saveLastProcessedSignature(signature);
        return {peerAddress: senderAddress, type: 'read_receipt'};
      } catch {
        // Not a valid read receipt for us
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Fetch and process all new messages across ALL conversations.
 * Scans the user's own transaction history for new memo transactions.
 * This is the catch-up scan used on app launch and when returning from background.
 */
export async function fetchAllNewMessages(): Promise<string[]> {
  const walletKeypair = await getWalletKeypair();
  if (!walletKeypair) return [];

  const connection = await getConnection();
  const myAddress = walletKeypair.publicKey.toString();
  const myPubKeyBytes = walletKeypair.publicKey.toBytes();

  // Get the last processed signature to only fetch newer transactions
  const lastProcessedSig = await loadLastProcessedSignature();

  let signatures;
  try {
    signatures = await connection.getSignaturesForAddress(
      walletKeypair.publicKey,
      {
        limit: 100,
        ...(lastProcessedSig ? {until: lastProcessedSig} : {}),
      },
      'confirmed',
    );
  } catch (err) {
    console.warn('[Messages] Failed to fetch signatures:', err);
    return [];
  }

  if (signatures.length === 0) return [];

  // Process oldest first
  const affectedPeers: Set<string> = new Set();

  for (const sigInfo of [...signatures].reverse()) {
    const existing = await getMessageByTxSignature(sigInfo.signature);
    if (existing) continue;

    try {
      const txResponse = await connection.getTransaction(sigInfo.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (!txResponse) continue;

      const memoData = extractMemoFromTransaction(txResponse);
      if (!memoData) continue;

      const payloadType = getPayloadType(memoData);
      const accountKeys = getAccountKeysFromTx(txResponse);
      const senderAddress = accountKeys[0];
      const blockTime = txResponse.blockTime ?? 0;

      if (payloadType === 'message') {
        try {
          const embeddedRecipient = extractRecipientFromPayload(memoData);
          const embeddedRecipientAddress = new PublicKey(embeddedRecipient).toString();

          // Incoming message to us
          if (embeddedRecipientAddress === myAddress && senderAddress !== myAddress) {
            const senderPubKeyBytes = new PublicKey(senderAddress).toBytes();
            const plaintext = decryptMessage(
              memoData,
              walletKeypair.secretKey,
              senderPubKeyBytes,
            );

            await storeDecryptedMessage(
              sigInfo.signature, blockTime, senderAddress,
              senderAddress, myAddress, plaintext, false,
            );
            affectedPeers.add(senderAddress);
          }
          // Outgoing message from us
          else if (senderAddress === myAddress && embeddedRecipientAddress !== myAddress) {
            const recipientPubKeyBytes = new PublicKey(embeddedRecipientAddress).toBytes();
            const plaintext = decryptOwnMessage(
              memoData,
              walletKeypair.secretKey,
              recipientPubKeyBytes,
            );

            await storeDecryptedMessage(
              sigInfo.signature, blockTime, embeddedRecipientAddress,
              myAddress, embeddedRecipientAddress, plaintext, true,
            );
            affectedPeers.add(embeddedRecipientAddress);
          }
        } catch {
          continue;
        }
      } else if (payloadType === 'read_receipt' && senderAddress !== myAddress) {
        try {
          const senderPubKeyBytes = new PublicKey(senderAddress).toBytes();
          const ackedSignatures = decryptReadReceipt(
            memoData,
            walletKeypair.secretKey,
            senderPubKeyBytes,
          );
          for (const ackedSig of ackedSignatures) {
            await updateMessageReadStatus(ackedSig, 'read');
          }
          affectedPeers.add(senderAddress);
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  // Save the most recent signature as last processed
  if (signatures.length > 0) {
    await saveLastProcessedSignature(signatures[0].signature);
  }

  return [...affectedPeers];
}

/**
 * Fetch messages from on-chain transaction history for a specific conversation.
 * Used when opening a conversation to catch up on messages with a specific peer.
 */
export async function fetchOnChainMessages(
  peerAddress: string,
): Promise<void> {
  const walletKeypair = await getWalletKeypair();
  if (!walletKeypair) return;

  const connection = await getConnection();
  const myAddress = walletKeypair.publicKey.toString();
  const myPubKeyBytes = walletKeypair.publicKey.toBytes();
  const peerPubKey = new PublicKey(peerAddress);
  const peerPubKeyBytes = peerPubKey.toBytes();

  // Fetch recent tx signatures for both our address and the peer's
  const [mySignatures, peerSignatures] = await Promise.all([
    connection.getSignaturesForAddress(walletKeypair.publicKey, {limit: 50}, 'confirmed'),
    connection.getSignaturesForAddress(peerPubKey, {limit: 50}, 'confirmed'),
  ]);

  // Combine and deduplicate
  const allSigMap = new Map<string, number>();
  for (const s of mySignatures) {
    allSigMap.set(s.signature, s.blockTime ?? 0);
  }
  for (const s of peerSignatures) {
    allSigMap.set(s.signature, s.blockTime ?? 0);
  }

  for (const [signature, blockTime] of allSigMap) {
    const existing = await getMessageByTxSignature(signature);
    if (existing) continue;

    try {
      const txResponse = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (!txResponse) continue;

      const memoData = extractMemoFromTransaction(txResponse);
      if (!memoData) continue;

      const payloadType = getPayloadType(memoData);
      const accountKeys = getAccountKeysFromTx(txResponse);
      const senderAddress = accountKeys[0]; // fee payer = sender

      if (payloadType === 'message') {
        try {
          // Extract embedded recipient pubkey from the payload
          const embeddedRecipient = extractRecipientFromPayload(memoData);
          const embeddedRecipientAddress = new PublicKey(embeddedRecipient).toString();

          // Case 1: We sent this to the peer
          if (senderAddress === myAddress && embeddedRecipientAddress === peerAddress) {
            const plaintext = decryptOwnMessage(
              memoData,
              walletKeypair.secretKey,
              peerPubKeyBytes,
            );

            await storeDecryptedMessage(
              signature, blockTime, peerAddress,
              myAddress, peerAddress, plaintext, true,
            );
          }
          // Case 2: Peer sent this to us
          else if (senderAddress === peerAddress && embeddedRecipientAddress === myAddress) {
            const plaintext = decryptMessage(
              memoData,
              walletKeypair.secretKey,
              peerPubKeyBytes,
            );

            await storeDecryptedMessage(
              signature, blockTime, peerAddress,
              peerAddress, myAddress, plaintext, false,
            );
          }
          // else: not relevant to this conversation
        } catch {
          continue;
        }
      } else if (payloadType === 'read_receipt' && senderAddress === peerAddress) {
        try {
          const ackedSignatures = decryptReadReceipt(
            memoData,
            walletKeypair.secretKey,
            peerPubKeyBytes,
          );
          for (const ackedSig of ackedSignatures) {
            await updateMessageReadStatus(ackedSig, 'read');
          }
        } catch {
          // Not a valid read receipt for us
        }
      }
    } catch {
      continue;
    }
  }
}

/** Helper to store a decrypted message and update conversation */
async function storeDecryptedMessage(
  signature: string,
  blockTime: number,
  conversationId: string,
  senderAddress: string,
  recipientAddress: string,
  plaintext: string,
  isMine: boolean,
): Promise<void> {
  const messageId = `msg_${blockTime || Date.now()}_${signature.slice(0, 8)}`;
  const timestamp = (blockTime ?? Math.floor(Date.now() / 1000)) * 1000;

  // Detect payment messages
  let messageType: 'text' | 'payment' = 'text';
  let displayText = plaintext;
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed.type === 'payment') {
      messageType = 'payment';
      displayText = `Sent ${parsed.amount} ${parsed.token}`;
    }
  } catch { /* text message */ }

  await insertMessage({
    id: messageId,
    conversation_id: conversationId,
    sender_address: senderAddress,
    recipient_address: recipientAddress,
    plaintext,
    tx_signature: signature,
    timestamp,
    status: 'confirmed',
    read_status: isMine ? 'sent' : 'delivered',
    message_type: messageType,
  });

  await upsertConversation({
    id: conversationId,
    peer_address: conversationId,
    peer_name: null,
    peer_enc_pubkey: null,
    last_message_text: messageType === 'payment' ? displayText : plaintext,
    last_message_time: timestamp,
    ...(!isMine ? {unread_count: 1} : {}),
  });
}

/** Send read receipts for unread messages in a conversation */
export async function sendReadReceipts(
  peerAddress: string,
): Promise<void> {
  const walletKeypair = await getWalletKeypair();
  if (!walletKeypair) return;

  // Get unread messages from peer in this conversation
  const unreadMessages = await getUnreadMessagesForConversation(
    peerAddress,
    walletKeypair.publicKey.toString(),
  );

  if (unreadMessages.length === 0) return;

  // Get signatures we've already sent receipts for
  const alreadySent = await getReadReceiptSentSignatures(peerAddress);
  const alreadySentSet = new Set(alreadySent);

  // Filter to only unsent receipts
  const toAck = unreadMessages
    .filter(m => m.tx_signature && !alreadySentSet.has(m.tx_signature))
    .map(m => m.tx_signature!);

  if (toAck.length === 0) return;

  try {
    const peerPubKey = new PublicKey(peerAddress).toBytes();

    // Create encrypted read receipt
    const receiptPayload = createReadReceipt(
      toAck,
      walletKeypair.secretKey,
      peerPubKey,
    );

    // Send on-chain
    await sendEncryptedMemoTransaction(
      walletKeypair,
      peerAddress,
      receiptPayload,
    );

    // Mark as sent locally
    for (const sig of toAck) {
      await markReadReceiptSent(sig, peerAddress);
    }
  } catch (err) {
    console.warn('Failed to send read receipt:', err);
  }
}

// --- Persistence for last processed signature ---

async function saveLastProcessedSignature(sig: string): Promise<void> {
  try {
    await secureStore(LAST_SIGNATURE_KEY, sig);
  } catch {
    // Non-critical — worst case we re-process some transactions
  }
}

async function loadLastProcessedSignature(): Promise<string | null> {
  try {
    return await secureRetrieve(LAST_SIGNATURE_KEY);
  } catch {
    return null;
  }
}

// --- Helpers ---

function getAccountKeysFromTx(txResponse: any): string[] {
  const tx = txResponse.transaction;
  const message = tx.message;
  const accountKeys = message.staticAccountKeys ?? message.accountKeys ?? [];
  return accountKeys.map((k: any) => k.toString());
}

function extractMemoFromTransaction(txResponse: any): string | null {
  const tx = txResponse.transaction;
  const message = tx.message;
  const instructions =
    message.compiledInstructions ?? message.instructions ?? [];
  const accountKeys =
    message.staticAccountKeys ?? message.accountKeys ?? [];

  for (const instruction of instructions) {
    const programIdIndex = instruction.programIdIndex;
    const programId = accountKeys[programIdIndex];

    if (programId?.toString() === MEMO_PROGRAM_ID_STR) {
      const data = instruction.data;
      if (typeof data === 'string') {
        return data;
      }
      if (data instanceof Uint8Array || Buffer.isBuffer(data)) {
        return Buffer.from(data).toString('utf-8');
      }
    }
  }

  // Fallback: parse from logs
  const logs = txResponse.meta?.logMessages ?? [];
  for (const log of logs) {
    const memoMatch = log.match(/^Program log: Memo \(len \d+\): (.+)$/);
    if (memoMatch) {
      return memoMatch[1];
    }
  }

  return null;
}
