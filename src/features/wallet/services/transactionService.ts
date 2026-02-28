// src/features/wallet/services/transactionService.ts
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {getConnection} from '../../../core/solana/connection';
import {STANDARD_FEE_LAMPORTS} from '../../../core/solana/constants';

export interface SendSolResult {
  signature: string;
  fee: number; // in lamports
}

export interface TransactionRecord {
  signature: string;
  type: 'send' | 'receive' | 'message';
  amount: number; // SOL
  counterparty: string; // address
  timestamp: number;
  status: 'pending' | 'confirmed' | 'finalized' | 'failed';
}

/** Send SOL to a recipient address */
export async function sendSol(
  senderKeypair: Keypair,
  recipientAddress: string,
  amountSol: number,
): Promise<SendSolResult> {
  const connection = await getConnection();
  const recipient = new PublicKey(recipientAddress);
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  if (lamports <= 0) {
    throw new Error('Amount must be positive');
  }

  const balance = await connection.getBalance(senderKeypair.publicKey);
  const estimatedFee = STANDARD_FEE_LAMPORTS;

  if (balance < lamports + estimatedFee) {
    throw new Error(
      `Insufficient balance. Have: ${balance / LAMPORTS_PER_SOL} SOL, ` +
        `Need: ${(lamports + estimatedFee) / LAMPORTS_PER_SOL} SOL`,
    );
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: recipient,
      lamports,
    }),
  );

  const {blockhash} = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = senderKeypair.publicKey;

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [senderKeypair],
    {commitment: 'confirmed', maxRetries: 3},
  );

  return {signature, fee: estimatedFee};
}

/** Get SOL balance for a public key */
export async function getBalance(publicKey: PublicKey): Promise<number> {
  const connection = await getConnection();
  const lamports = await connection.getBalance(publicKey, 'confirmed');
  return lamports / LAMPORTS_PER_SOL;
}

/** Get estimated transaction fee */
export function estimateFee(): number {
  return STANDARD_FEE_LAMPORTS;
}

/** Fetch recent transaction signatures for a public key */
export async function getRecentTransactions(
  publicKey: PublicKey,
  limit = 20,
): Promise<TransactionRecord[]> {
  const connection = await getConnection();
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit,
  });

  const records: TransactionRecord[] = [];

  for (const sigInfo of signatures) {
    const tx = await connection.getTransaction(sigInfo.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      continue;
    }

    const accountKeys =
      tx.transaction.message.getAccountKeys?.() ??
      (tx.transaction.message as any).accountKeys;

    if (!accountKeys || accountKeys.length < 2) {
      continue;
    }

    const sender = accountKeys.get(0)?.toString();
    const isSend = sender === publicKey.toString();

    // Check if this is a message tx (has memo) or a plain transfer
    const hasMemo = tx.meta.logMessages?.some((log: string) =>
      log.includes('Program log: Memo'),
    );

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const balanceDiff = Math.abs(
      (preBalances[0] - postBalances[0]) / LAMPORTS_PER_SOL,
    );

    records.push({
      signature: sigInfo.signature,
      type: hasMemo ? 'message' : isSend ? 'send' : 'receive',
      amount: balanceDiff,
      counterparty: isSend
        ? (accountKeys.get(1)?.toString() ?? '')
        : (sender ?? ''),
      timestamp: (sigInfo.blockTime ?? 0) * 1000,
      status: sigInfo.confirmationStatus === 'finalized' ? 'finalized' : 'confirmed',
    });
  }

  return records;
}

/** Validate a Solana address */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
