// src/features/messaging/services/memoTransactionService.ts
import {
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {getConnection} from '../../../core/solana/connection';
import {MEMO_PROGRAM_ID, MEMO_MAX_BYTES} from '../../../core/solana/constants';

/**
 * Build and send a Solana transaction containing an encrypted message
 * in a Memo instruction.
 */
export async function sendEncryptedMemoTransaction(
  senderKeypair: Keypair,
  recipientAddress: string,
  serializedPayload: string, // base64-encoded encrypted payload
): Promise<string> {
  const connection = await getConnection();
  const recipientPubkey = new PublicKey(recipientAddress);

  // Validate payload size
  const payloadBytes = new TextEncoder().encode(serializedPayload);
  if (payloadBytes.length > MEMO_MAX_BYTES) {
    throw new Error(
      `Payload too large for Memo: ${payloadBytes.length} bytes (max ${MEMO_MAX_BYTES}). ` +
        'Shorten your message.',
    );
  }

  const transaction = new Transaction();

  // Memo instruction — only sender as signer (Memo requires all account keys to be signers)
  const memoInstruction = new TransactionInstruction({
    keys: [
      {pubkey: senderKeypair.publicKey, isSigner: true, isWritable: true},
    ],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(serializedPayload, 'utf-8'),
  });

  transaction.add(memoInstruction);

  const {blockhash} = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = senderKeypair.publicKey;

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [senderKeypair],
    {commitment: 'confirmed', maxRetries: 3},
  );

  return signature;
}
