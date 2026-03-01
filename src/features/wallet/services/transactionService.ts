/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
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
import {
  STANDARD_FEE_LAMPORTS,
  USDC_MINT,
  USDT_MINT,
  DEVNET_USDC_MINT,
  DEVNET_USDT_MINT,
  type TokenSymbol,
} from '../../../core/solana/constants';
import {isDevnetActive} from '../../../core/solana/connection';
import {TOKEN_PROGRAM_ID} from '@solana/spl-token';

export interface SendSolResult {
  signature: string;
  fee: number; // in lamports
}

export interface TransactionRecord {
  signature: string;
  type: 'send' | 'receive' | 'message' | 'token_send' | 'token_receive';
  amount: number;
  token: TokenSymbol;
  counterparty: string;
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

/** Resolve a mint address to a token symbol */
function resolveTokenSymbol(mintAddress: string): TokenSymbol | null {
  const devnet = isDevnetActive();
  const usdcMint = devnet ? DEVNET_USDC_MINT.toString() : USDC_MINT.toString();
  const usdtMint = devnet ? DEVNET_USDT_MINT.toString() : USDT_MINT.toString();

  if (mintAddress === usdcMint) return 'USDC';
  if (mintAddress === usdtMint) return 'USDT';
  return null;
}

/** Fetch recent transactions using parsed individual RPC calls */
export async function getRecentTransactions(
  publicKey: PublicKey,
  limit = 20,
): Promise<TransactionRecord[]> {
  const connection = await getConnection();
  const myAddress = publicKey.toString();

  let signatures;
  try {
    signatures = await connection.getSignaturesForAddress(publicKey, {limit});
  } catch (err) {
    console.warn('[TxHistory] getSignaturesForAddress failed:', err);
    return [];
  }

  if (!signatures || signatures.length === 0) {
    return [];
  }

  // Fetch parsed transactions in small parallel batches to avoid rate limiting
  const BATCH_SIZE = 3;
  const parsedTxs: (any | null)[] = [];

  for (let batch = 0; batch < signatures.length; batch += BATCH_SIZE) {
    const batchSigs = signatures.slice(batch, batch + BATCH_SIZE);
    const results = await Promise.all(
      batchSigs.map(s =>
        connection
          .getParsedTransaction(s.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
          })
          .catch(() => null),
      ),
    );
    parsedTxs.push(...results);
  }

  const records: TransactionRecord[] = [];

  for (let i = 0; i < signatures.length; i++) {
    const sigInfo = signatures[i];
    const tx = parsedTxs[i];

    if (!tx || !tx.meta) continue;

    try {
      const accountKeys = tx.transaction.message.accountKeys;
      if (!accountKeys || accountKeys.length < 1) continue;

      const feePayer = accountKeys[0].pubkey.toString();
      const isSender = feePayer === myAddress;

      // Check for SPL token transfers via pre/post token balances
      const preTokenBalances = tx.meta.preTokenBalances ?? [];
      const postTokenBalances = tx.meta.postTokenBalances ?? [];

      if (preTokenBalances.length > 0 || postTokenBalances.length > 0) {
        const tokenTransfer = parseTokenTransfer(
          myAddress,
          preTokenBalances,
          postTokenBalances,
          accountKeys,
        );

        if (tokenTransfer) {
          records.push({
            signature: sigInfo.signature,
            type: tokenTransfer.isSend ? 'token_send' : 'token_receive',
            amount: Math.abs(tokenTransfer.amount),
            token: tokenTransfer.token,
            counterparty: tokenTransfer.counterparty,
            timestamp: (sigInfo.blockTime ?? 0) * 1000,
            status:
              sigInfo.confirmationStatus === 'finalized'
                ? 'finalized'
                : 'confirmed',
          });
          continue;
        }
      }

      // Check for memo (message) transactions
      const hasMemo =
        tx.transaction.message.instructions.some(
          (ix: any) =>
            ix.programId?.toString() ===
            'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
        ) ||
        tx.meta.logMessages?.some((log: string) =>
          log.includes('Program log: Memo'),
        );

      // SOL balance change for our account
      const myAccountIndex = accountKeys.findIndex(
        (k: any) => k.pubkey.toString() === myAddress,
      );

      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;

      let balanceDiff = 0;
      if (myAccountIndex >= 0) {
        balanceDiff =
          (postBalances[myAccountIndex] - preBalances[myAccountIndex]) /
          LAMPORTS_PER_SOL;
      }

      // Determine counterparty
      let counterparty = '';
      if (isSender && accountKeys.length >= 2) {
        counterparty = accountKeys[1].pubkey.toString();
      } else {
        counterparty = feePayer;
      }

      records.push({
        signature: sigInfo.signature,
        type: hasMemo ? 'message' : balanceDiff < 0 ? 'send' : 'receive',
        amount: Math.abs(balanceDiff),
        token: 'SOL',
        counterparty,
        timestamp: (sigInfo.blockTime ?? 0) * 1000,
        status:
          sigInfo.confirmationStatus === 'finalized'
            ? 'finalized'
            : 'confirmed',
      });
    } catch (err) {
      console.warn('[TxHistory] Failed to parse tx:', sigInfo.signature, err);
      continue;
    }
  }

  return records;
}

/** Parse SPL token transfer from pre/post token balances */
function parseTokenTransfer(
  myAddress: string,
  preBals: any[],
  postBals: any[],
  accountKeys: any,
): {isSend: boolean; amount: number; token: TokenSymbol; counterparty: string} | null {
  // Build balance maps by owner
  const preMap = new Map<string, {amount: number; mint: string}>();
  const postMap = new Map<string, {amount: number; mint: string}>();

  for (const bal of preBals) {
    const owner = bal.owner;
    const mint = bal.mint;
    const amount = bal.uiTokenAmount?.uiAmount ?? 0;
    if (owner && mint) {
      preMap.set(`${owner}:${mint}`, {amount, mint});
    }
  }

  for (const bal of postBals) {
    const owner = bal.owner;
    const mint = bal.mint;
    const amount = bal.uiTokenAmount?.uiAmount ?? 0;
    if (owner && mint) {
      postMap.set(`${owner}:${mint}`, {amount, mint});
    }
  }

  // Find our balance change
  for (const [key, postVal] of postMap.entries()) {
    const preVal = preMap.get(key);
    const preAmount = preVal?.amount ?? 0;
    const diff = postVal.amount - preAmount;

    const [owner] = key.split(':');
    if (owner !== myAddress) continue;

    const token = resolveTokenSymbol(postVal.mint);
    if (!token) continue;
    if (Math.abs(diff) < 0.000001) continue;

    // Find counterparty
    let counterparty = '';
    for (const [otherKey, otherPostVal] of postMap.entries()) {
      const [otherOwner] = otherKey.split(':');
      if (otherOwner === myAddress) continue;
      if (otherPostVal.mint === postVal.mint) {
        counterparty = otherOwner;
        break;
      }
    }

    return {
      isSend: diff < 0,
      amount: Math.abs(diff),
      token,
      counterparty,
    };
  }

  return null;
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
