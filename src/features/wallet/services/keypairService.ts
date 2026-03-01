/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/wallet/services/keypairService.ts
import {Keypair} from '@solana/web3.js';
import {derivePath} from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import {mnemonicToSeed} from './mnemonicService';
import {
  secureStore,
  secureRetrieve,
} from '../../../core/storage/secureStorage';
import {SOLANA_DERIVATION_PATH} from '../../../core/solana/constants';

const ENCRYPTION_SK_KEY = 'sol_vault_x25519_sk';
const ENCRYPTION_PK_KEY = 'sol_vault_x25519_pk';
const WALLET_SK_KEY = 'sol_vault_wallet_sk';

/** Derive Solana Ed25519 keypair from mnemonic using standard BIP44 path */
export async function deriveWalletKeypair(mnemonic: string): Promise<Keypair> {
  const seed = await mnemonicToSeed(mnemonic);
  const derivedSeed = derivePath(
    SOLANA_DERIVATION_PATH,
    seed.toString('hex'),
  ).key;
  return Keypair.fromSeed(derivedSeed);
}

/** Store the wallet secret key in secure storage for quick access */
export async function storeWalletKeypair(keypair: Keypair): Promise<void> {
  await secureStore(
    WALLET_SK_KEY,
    Buffer.from(keypair.secretKey).toString('base64'),
  );
}

/** Retrieve wallet keypair from secure storage */
export async function getWalletKeypair(): Promise<Keypair | null> {
  const skBase64 = await secureRetrieve(WALLET_SK_KEY);
  if (!skBase64) {
    return null;
  }
  const secretKey = new Uint8Array(Buffer.from(skBase64, 'base64'));
  return Keypair.fromSecretKey(secretKey);
}

/** Generate a dedicated X25519 keypair for messaging encryption (NOT derived from wallet keys) */
export async function generateAndStoreEncryptionKeypair(): Promise<{
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}> {
  const keyPair = nacl.box.keyPair();

  await secureStore(
    ENCRYPTION_SK_KEY,
    Buffer.from(keyPair.secretKey).toString('base64'),
  );
  await secureStore(
    ENCRYPTION_PK_KEY,
    Buffer.from(keyPair.publicKey).toString('base64'),
  );

  return keyPair;
}

/** Retrieve X25519 encryption keypair from secure storage */
export async function getEncryptionKeypair(): Promise<{
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} | null> {
  const skBase64 = await secureRetrieve(ENCRYPTION_SK_KEY);
  const pkBase64 = await secureRetrieve(ENCRYPTION_PK_KEY);

  if (!skBase64 || !pkBase64) {
    return null;
  }

  return {
    secretKey: new Uint8Array(Buffer.from(skBase64, 'base64')),
    publicKey: new Uint8Array(Buffer.from(pkBase64, 'base64')),
  };
}

/** Get the encryption public key as base64 string (for registration with backend) */
export async function getEncryptionPubKeyBase64(): Promise<string | null> {
  return secureRetrieve(ENCRYPTION_PK_KEY);
}
