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

/** Encrypted payload header overhead: version(1) + senderPK(32) + recipientPK(32) + nonce(24) + MAC(16) + timestamp(8) */
export const PAYLOAD_OVERHEAD_BYTES = 113;
