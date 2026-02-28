// src/features/messaging/services/messageService.ts
import {getConnection} from '../../../core/solana/connection';
import {
  encryptMessage,
  serializePayload,
  decryptMessage,
} from './encryptionService';
import {sendEncryptedMemoTransaction} from './memoTransactionService';
import {getEncryptionKeypair, getWalletKeypair} from '../../wallet/services/keypairService';
import {lookupUser, relayTxSignature} from '../../../core/api/backendClient';
import {
  insertMessage,
  upsertConversation,
  type StoredMessage,
} from '../../../core/storage/database';

const MEMO_PROGRAM_ID_STR = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

/** High-level: encrypt, send on-chain, relay signature, store locally */
export async function sendMessage(
  recipientAddress: string,
  plaintext: string,
): Promise<{txSignature: string; messageId: string}> {
  const walletKeypair = await getWalletKeypair();
  if (!walletKeypair) {
    throw new Error('Wallet not initialized');
  }

  const encKeypair = await getEncryptionKeypair();
  if (!encKeypair) {
    throw new Error('Encryption keypair not found');
  }

  // Look up recipient's encryption public key
  const recipientUser = await lookupUser(recipientAddress);
  if (!recipientUser) {
    throw new Error('Recipient not found in directory');
  }

  const recipientEncPubKey = new Uint8Array(
    Buffer.from(recipientUser.encryptionPubKey, 'base64'),
  );

  // Encrypt
  const payload = encryptMessage(
    plaintext,
    encKeypair.secretKey,
    encKeypair.publicKey,
    recipientEncPubKey,
  );
  const serialized = serializePayload(payload);

  // Send on-chain
  const txSignature = await sendEncryptedMemoTransaction(
    walletKeypair,
    recipientAddress,
    serialized,
  );

  // Relay signature to backend for push notification
  await relayTxSignature({
    recipientAddress,
    txSignature,
    senderAddress: walletKeypair.publicKey.toString(),
  });

  // Store locally
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const conversationId = recipientAddress;

  const storedMessage: StoredMessage = {
    id: messageId,
    conversation_id: conversationId,
    sender_address: walletKeypair.publicKey.toString(),
    recipient_address: recipientAddress,
    plaintext,
    tx_signature: txSignature,
    timestamp: payload.timestamp,
    status: 'confirmed',
  };

  await insertMessage(storedMessage);

  // Update conversation
  await upsertConversation({
    id: conversationId,
    peer_address: recipientAddress,
    peer_name: recipientUser.displayName,
    peer_enc_pubkey: recipientUser.encryptionPubKey,
    last_message_text: plaintext,
    last_message_time: payload.timestamp,
  });

  return {txSignature, messageId};
}

/** Fetch a transaction from chain, extract memo, decrypt */
export async function fetchAndDecryptMessage(
  txSignature: string,
  recipientSecretKey: Uint8Array,
): Promise<{
  plaintext: string;
  senderEncPubKey: Uint8Array;
  timestamp: number;
  signature: string;
}> {
  const connection = await getConnection();

  const txResponse = await connection.getTransaction(txSignature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!txResponse) {
    throw new Error(`Transaction not found: ${txSignature}`);
  }

  const memoData = extractMemoFromTransaction(txResponse);

  if (!memoData) {
    throw new Error('No memo data found in transaction');
  }

  const decrypted = decryptMessage(memoData, recipientSecretKey);

  return {
    ...decrypted,
    signature: txSignature,
  };
}

/** Extract memo data from a parsed Solana transaction */
function extractMemoFromTransaction(txResponse: any): string | null {
  // Method 1: Parse from instruction data
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

  // Method 2: Fallback — parse from logs
  const logs = txResponse.meta?.logMessages ?? [];
  for (const log of logs) {
    const memoMatch = log.match(/^Program log: Memo \(len \d+\): (.+)$/);
    if (memoMatch) {
      return memoMatch[1];
    }
  }

  return null;
}

/** Process incoming message notification: fetch, decrypt, store locally */
export async function processIncomingMessage(
  txSignature: string,
  senderAddress: string,
): Promise<StoredMessage> {
  const encKeypair = await getEncryptionKeypair();
  if (!encKeypair) {
    throw new Error('Encryption keypair not found');
  }

  const walletKeypair = await getWalletKeypair();
  if (!walletKeypair) {
    throw new Error('Wallet not initialized');
  }

  const {plaintext, timestamp} = await fetchAndDecryptMessage(
    txSignature,
    encKeypair.secretKey,
  );

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const conversationId = senderAddress;

  const storedMessage: StoredMessage = {
    id: messageId,
    conversation_id: conversationId,
    sender_address: senderAddress,
    recipient_address: walletKeypair.publicKey.toString(),
    plaintext,
    tx_signature: txSignature,
    timestamp,
    status: 'confirmed',
  };

  await insertMessage(storedMessage);

  // Look up sender info for conversation
  const senderUser = await lookupUser(senderAddress);

  await upsertConversation({
    id: conversationId,
    peer_address: senderAddress,
    peer_name: senderUser?.displayName ?? null,
    peer_enc_pubkey: senderUser?.encryptionPubKey ?? null,
    last_message_text: plaintext,
    last_message_time: timestamp,
    unread_count: 1, // Will be incremented
  });

  return storedMessage;
}
