/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/core/solana/constants.ts
import {PublicKey} from '@solana/web3.js';

/** Standard BIP44 derivation path for Solana (Phantom/Solflare compatible) */
export const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

/** SPL Memo Program v2 */
export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
);

/** Standard Solana transaction fee in lamports */
export const STANDARD_FEE_LAMPORTS = 5_000;

/** Memo payload max bytes (UTF-8) */
export const MEMO_MAX_BYTES = 566;

/** Message version byte */
export const MESSAGE_VERSION = 0x01;

/** Read receipt version byte */
export const READ_RECEIPT_VERSION = 0x02;

/** Encrypted payload header overhead: version(1) + nonce(24) + MAC(16) */
export const PAYLOAD_OVERHEAD_BYTES = 41;

// --- SPL Token Constants ---

/** USDC Mint (Mainnet) */
export const USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
);

/** USDT Mint (Mainnet) */
export const USDT_MINT = new PublicKey(
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
);

/** Devnet USDC (Circle faucet) */
export const DEVNET_USDC_MINT = new PublicKey(
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
);

/** Devnet USDT placeholder */
export const DEVNET_USDT_MINT = new PublicKey(
  'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS',
);

/** ATA rent exemption in lamports (~0.00203928 SOL) */
export const ATA_RENT_LAMPORTS = 2_039_280;

export type TokenSymbol = 'SOL' | 'USDC' | 'USDT';

export interface TokenInfo {
  symbol: TokenSymbol;
  name: string;
  mint: PublicKey | null; // null for native SOL
  decimals: number;
  icon: string;
  logoUrl: string;
}

/** TrustWallet GitHub asset logos */
export const TOKEN_LOGOS: Record<TokenSymbol, string> = {
  SOL: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
};

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {symbol: 'SOL', name: 'Solana', mint: null, decimals: 9, icon: '◎', logoUrl: TOKEN_LOGOS.SOL},
  {symbol: 'USDC', name: 'USD Coin', mint: USDC_MINT, decimals: 6, icon: '$', logoUrl: TOKEN_LOGOS.USDC},
  {symbol: 'USDT', name: 'Tether', mint: USDT_MINT, decimals: 6, icon: '₮', logoUrl: TOKEN_LOGOS.USDT},
];
