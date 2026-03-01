/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/wallet/services/tokenService.ts
import {
  Keypair,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import {getConnection} from '../../../core/solana/connection';
import {
  USDC_MINT,
  USDT_MINT,
  DEVNET_USDC_MINT,
  DEVNET_USDT_MINT,
  STANDARD_FEE_LAMPORTS,
  ATA_RENT_LAMPORTS,
  type TokenSymbol,
  SUPPORTED_TOKENS,
  TOKEN_LOGOS,
} from '../../../core/solana/constants';
import {isDevnetActive} from '../../../core/solana/connection';
import type {SendSolResult} from './transactionService';

export interface TokenBalance {
  symbol: TokenSymbol;
  name: string;
  icon: string;
  logoUrl: string;
  balance: number;
  usdValue: number;
}

export interface AllBalances {
  tokens: TokenBalance[];
  totalUsd: number;
  solPrice: number;
}

// --- Price Cache ---
let cachedSolPrice = 0;
let lastPriceTime = 0;
const PRICE_CACHE_MS = 60_000; // 60 seconds

/** Fetch SOL price from Jupiter Price API */
export async function getSolPrice(): Promise<number> {
  const now = Date.now();
  if (cachedSolPrice > 0 && now - lastPriceTime < PRICE_CACHE_MS) {
    return cachedSolPrice;
  }

  try {
    const res = await fetch(
      'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112',
    );
    const data = await res.json();
    const price =
      data?.data?.['So11111111111111111111111111111111111111112']?.price;
    if (price && typeof price === 'number') {
      cachedSolPrice = price;
      lastPriceTime = now;
      return price;
    }
  } catch {
    // fallback below
  }

  // Fallback: try CoinGecko
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    );
    const data = await res.json();
    const price = data?.solana?.usd;
    if (price && typeof price === 'number') {
      cachedSolPrice = price;
      lastPriceTime = now;
      return price;
    }
  } catch {
    // use cached or default
  }

  return cachedSolPrice || 0;
}

/** Get the correct mint for a token symbol based on network */
export function getMintForToken(symbol: TokenSymbol): PublicKey | null {
  if (symbol === 'SOL') return null;
  const devnet = isDevnetActive();
  if (symbol === 'USDC') return devnet ? DEVNET_USDC_MINT : USDC_MINT;
  if (symbol === 'USDT') return devnet ? DEVNET_USDT_MINT : USDT_MINT;
  return null;
}

/** Fetch all token balances (SOL + USDC + USDT) with USD values */
export async function getTokenBalances(
  publicKey: PublicKey,
): Promise<AllBalances> {
  const connection = await getConnection();

  // Fetch SOL balance
  const solLamports = await connection.getBalance(publicKey, 'confirmed');
  const solBalance = solLamports / LAMPORTS_PER_SOL;

  // Fetch SPL token accounts
  let usdcBalance = 0;
  let usdtBalance = 0;

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      {programId: TOKEN_PROGRAM_ID},
    );

    const usdcMint = getMintForToken('USDC')!.toString();
    const usdtMint = getMintForToken('USDT')!.toString();

    for (const account of tokenAccounts.value) {
      const info = account.account.data.parsed?.info;
      if (!info) continue;

      const mint = info.mint;
      const amount = info.tokenAmount?.uiAmount ?? 0;

      if (mint === usdcMint) {
        usdcBalance = amount;
      } else if (mint === usdtMint) {
        usdtBalance = amount;
      }
    }
  } catch {
    // Token accounts may not exist yet
  }

  // Fetch SOL price
  const solPrice = await getSolPrice();

  const tokens: TokenBalance[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      icon: '◎',
      logoUrl: TOKEN_LOGOS.SOL,
      balance: solBalance,
      usdValue: solBalance * solPrice,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      icon: '$',
      logoUrl: TOKEN_LOGOS.USDC,
      balance: usdcBalance,
      usdValue: usdcBalance, // 1:1 USD
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      icon: '₮',
      logoUrl: TOKEN_LOGOS.USDT,
      balance: usdtBalance,
      usdValue: usdtBalance, // 1:1 USD
    },
  ];

  const totalUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);

  return {tokens, totalUsd, solPrice};
}

/** Send SPL token (USDC or USDT) to a recipient */
export async function sendSplToken(
  senderKeypair: Keypair,
  recipientAddress: string,
  mint: PublicKey,
  amount: number,
  decimals: number,
): Promise<SendSolResult> {
  const connection = await getConnection();
  const recipient = new PublicKey(recipientAddress);

  const senderAta = await getAssociatedTokenAddress(
    mint,
    senderKeypair.publicKey,
  );
  const recipientAta = await getAssociatedTokenAddress(mint, recipient);

  const transaction = new Transaction();

  // Check if recipient ATA exists; create if not
  let needsAtaCreation = false;
  try {
    await getAccount(connection, recipientAta);
  } catch {
    needsAtaCreation = true;
    transaction.add(
      createAssociatedTokenAccountInstruction(
        senderKeypair.publicKey,
        recipientAta,
        recipient,
        mint,
      ),
    );
  }

  // Transfer instruction
  const rawAmount = BigInt(Math.round(amount * 10 ** decimals));
  transaction.add(
    createTransferInstruction(
      senderAta,
      recipientAta,
      senderKeypair.publicKey,
      rawAmount,
    ),
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

  const fee = needsAtaCreation
    ? STANDARD_FEE_LAMPORTS + ATA_RENT_LAMPORTS
    : STANDARD_FEE_LAMPORTS;

  return {signature, fee};
}
