/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/services/encryptionService.ts
// E2E encryption using Ed25519→X25519 key conversion from Solana wallet keys.
// Only version + nonce + ciphertext goes on-chain. Zero key material on-chain.

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import {MESSAGE_VERSION, READ_RECEIPT_VERSION} from '../../../core/solana/constants';

// Field prime for Curve25519: p = 2^255 - 19
const CURVE_P = (1n << 255n) - 19n;

/** Modular exponentiation: base^exp mod mod */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Convert an Ed25519 secret key (64-byte Solana secretKey) to an X25519 secret key.
 * Process: SHA-512(seed), take first 32 bytes, clamp for Curve25519.
 */
export function ed25519SecretToX25519(ed25519SecretKey: Uint8Array): Uint8Array {
  const seed = ed25519SecretKey.slice(0, 32);
  // nacl.hash() is SHA-512, returns 64 bytes — pure JS, no Node crypto
  const hash = nacl.hash(seed);
  const x25519Secret = new Uint8Array(hash.slice(0, 32));
  // Clamp for Curve25519
  x25519Secret[0] &= 248;
  x25519Secret[31] &= 127;
  x25519Secret[31] |= 64;
  return x25519Secret;
}

/**
 * Convert an Ed25519 public key to an X25519 public key.
 * Formula: u = (1 + y) / (1 - y) mod p
 * where y is the Edwards y-coordinate from the compressed point.
 */
export function ed25519PublicToX25519(ed25519PublicKey: Uint8Array): Uint8Array {
  // Read y coordinate from Ed25519 public key (little-endian, clear sign bit)
  let y = 0n;
  for (let i = 0; i < 32; i++) {
    y |= BigInt(ed25519PublicKey[i]) << BigInt(8 * i);
  }
  y &= (1n << 255n) - 1n; // Clear top bit (sign bit)

  // u = (1 + y) * (1 - y)^(-1) mod p
  const num = (1n + y) % CURVE_P;
  const den = ((CURVE_P + 1n - y) % CURVE_P);
  // Fermat's little theorem: a^(-1) = a^(p-2) mod p
  const denInv = modPow(den, CURVE_P - 2n, CURVE_P);
  const u = (num * denInv) % CURVE_P;

  // Write u as little-endian 32 bytes
  const result = new Uint8Array(32);
  let val = u;
  for (let i = 0; i < 32; i++) {
    result[i] = Number(val & 0xFFn);
    val >>= 8n;
  }
  return result;
}

/**
 * Encrypt a message.
 * Wire format: [version:1B][recipientPubKey:32B][nonce:24B][ciphertext:varB]
 * The recipient pubkey is embedded so we can identify who the message is for
 * when scanning transaction history. Only the ciphertext is secret.
 */
export function encryptMessage(
  plaintext: string,
  senderEd25519SecretKey: Uint8Array, // 64-byte Solana secret key
  recipientEd25519PublicKey: Uint8Array, // 32-byte Solana public key
): {serialized: string; timestamp: number} {
  const messageBytes = naclUtil.decodeUTF8(plaintext);
  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes

  const senderX25519Secret = ed25519SecretToX25519(senderEd25519SecretKey);
  const recipientX25519Public = ed25519PublicToX25519(recipientEd25519PublicKey);

  const ciphertext = nacl.box(
    messageBytes,
    nonce,
    recipientX25519Public,
    senderX25519Secret,
  );

  if (!ciphertext) {
    throw new Error('Encryption failed');
  }

  // Wire format: [version:1B][recipientPubKey:32B][nonce:24B][ciphertext:varB]
  const totalLength = 1 + 32 + 24 + ciphertext.length;
  const buffer = new Uint8Array(totalLength);
  buffer[0] = MESSAGE_VERSION;
  buffer.set(recipientEd25519PublicKey, 1);
  buffer.set(nonce, 33);
  buffer.set(ciphertext, 57);

  return {
    serialized: naclUtil.encodeBase64(buffer),
    timestamp: Date.now(),
  };
}

/**
 * Extract the embedded recipient public key from a serialized message payload.
 */
export function extractRecipientFromPayload(serializedPayload: string): Uint8Array {
  const buffer = naclUtil.decodeBase64(serializedPayload);
  if (buffer[0] !== MESSAGE_VERSION) {
    throw new Error(`Unsupported message version: ${buffer[0]}`);
  }
  return buffer.slice(1, 33);
}

/**
 * Decrypt a message from on-chain memo data.
 * Wire format: [version:1B][recipientPubKey:32B][nonce:24B][ciphertext:varB]
 * The sender's Ed25519 public key is known from the transaction signer.
 */
export function decryptMessage(
  serializedPayload: string,
  recipientEd25519SecretKey: Uint8Array, // 64-byte Solana secret key
  senderEd25519PublicKey: Uint8Array, // 32-byte Solana public key (tx signer)
): string {
  const buffer = naclUtil.decodeBase64(serializedPayload);

  const version = buffer[0];
  if (version !== MESSAGE_VERSION) {
    throw new Error(`Unsupported message version: ${version}`);
  }

  // Skip recipient pubkey (bytes 1-32), read nonce and ciphertext
  const nonce = buffer.slice(33, 57);
  const ciphertext = buffer.slice(57);

  const recipientX25519Secret = ed25519SecretToX25519(recipientEd25519SecretKey);
  const senderX25519Public = ed25519PublicToX25519(senderEd25519PublicKey);

  const plaintext = nacl.box.open(
    ciphertext,
    nonce,
    senderX25519Public,
    recipientX25519Secret,
  );

  if (!plaintext) {
    throw new Error('Decryption failed — wrong key or tampered message');
  }

  return naclUtil.encodeUTF8(plaintext);
}

/**
 * Decrypt a message that WE sent (we are the sender, we want to read our own sent message).
 * Same shared secret: our secret + their public = their secret + our public.
 */
export function decryptOwnMessage(
  serializedPayload: string,
  senderEd25519SecretKey: Uint8Array, // our 64-byte Solana secret key
  recipientEd25519PublicKey: Uint8Array, // 32-byte recipient public key
): string {
  const buffer = naclUtil.decodeBase64(serializedPayload);

  const version = buffer[0];
  if (version !== MESSAGE_VERSION) {
    throw new Error(`Unsupported message version: ${version}`);
  }

  // Skip recipient pubkey (bytes 1-32), read nonce and ciphertext
  const nonce = buffer.slice(33, 57);
  const ciphertext = buffer.slice(57);

  const senderX25519Secret = ed25519SecretToX25519(senderEd25519SecretKey);
  const recipientX25519Public = ed25519PublicToX25519(recipientEd25519PublicKey);

  const plaintext = nacl.box.open(
    ciphertext,
    nonce,
    recipientX25519Public,
    senderX25519Secret,
  );

  if (!plaintext) {
    throw new Error('Decryption failed — wrong key or tampered message');
  }

  return naclUtil.encodeUTF8(plaintext);
}

/**
 * Create a read receipt payload.
 * Wire format: [READ_RECEIPT_VERSION:1B][nonce:24B][encrypted_signatures:varB]
 * The encrypted content is the newline-joined tx signatures being acknowledged.
 */
export function createReadReceipt(
  txSignatures: string[],
  senderEd25519SecretKey: Uint8Array,
  recipientEd25519PublicKey: Uint8Array,
): string {
  const data = txSignatures.join('\n');
  const messageBytes = naclUtil.decodeUTF8(data);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const senderX25519Secret = ed25519SecretToX25519(senderEd25519SecretKey);
  const recipientX25519Public = ed25519PublicToX25519(recipientEd25519PublicKey);

  const ciphertext = nacl.box(
    messageBytes,
    nonce,
    recipientX25519Public,
    senderX25519Secret,
  );

  if (!ciphertext) {
    throw new Error('Read receipt encryption failed');
  }

  const totalLength = 1 + 24 + ciphertext.length;
  const buffer = new Uint8Array(totalLength);
  buffer[0] = READ_RECEIPT_VERSION;
  buffer.set(nonce, 1);
  buffer.set(ciphertext, 25);

  return naclUtil.encodeBase64(buffer);
}

/**
 * Decrypt a read receipt to extract acknowledged tx signatures.
 */
export function decryptReadReceipt(
  serializedPayload: string,
  recipientEd25519SecretKey: Uint8Array,
  senderEd25519PublicKey: Uint8Array,
): string[] {
  const buffer = naclUtil.decodeBase64(serializedPayload);

  const version = buffer[0];
  if (version !== READ_RECEIPT_VERSION) {
    throw new Error(`Not a read receipt: version ${version}`);
  }

  const nonce = buffer.slice(1, 25);
  const ciphertext = buffer.slice(25);

  const recipientX25519Secret = ed25519SecretToX25519(recipientEd25519SecretKey);
  const senderX25519Public = ed25519PublicToX25519(senderEd25519PublicKey);

  const plaintext = nacl.box.open(
    ciphertext,
    nonce,
    senderX25519Public,
    recipientX25519Secret,
  );

  if (!plaintext) {
    throw new Error('Read receipt decryption failed');
  }

  return naclUtil.encodeUTF8(plaintext).split('\n').filter(Boolean);
}

/**
 * Check if a memo payload is a SolVault message (vs read receipt or unknown).
 */
export function getPayloadType(
  serializedPayload: string,
): 'message' | 'read_receipt' | 'unknown' {
  try {
    const buffer = naclUtil.decodeBase64(serializedPayload);
    if (buffer[0] === MESSAGE_VERSION) return 'message';
    if (buffer[0] === READ_RECEIPT_VERSION) return 'read_receipt';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
