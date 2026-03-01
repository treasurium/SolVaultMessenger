/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/core/crypto/nacl.ts
// Thin wrappers around tweetnacl for NaCl box (X25519 + XSalsa20-Poly1305)

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

export {nacl, naclUtil};

/** Generate an X25519 keypair for messaging encryption */
export function generateX25519Keypair(): nacl.BoxKeyPair {
  return nacl.box.keyPair();
}

/** Encrypt a plaintext string using NaCl box (X25519-XSalsa20-Poly1305) */
export function boxEncrypt(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array,
): {ciphertext: Uint8Array; nonce: Uint8Array} {
  const messageBytes = naclUtil.decodeUTF8(plaintext);
  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes

  const ciphertext = nacl.box(
    messageBytes,
    nonce,
    recipientPublicKey,
    senderSecretKey,
  );

  if (!ciphertext) {
    throw new Error('Encryption failed');
  }

  return {ciphertext, nonce};
}

/** Decrypt ciphertext using NaCl box.open */
export function boxDecrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array,
): string {
  const plaintext = nacl.box.open(
    ciphertext,
    nonce,
    senderPublicKey,
    recipientSecretKey,
  );

  if (!plaintext) {
    throw new Error('Decryption failed — wrong key or tampered message');
  }

  return naclUtil.encodeUTF8(plaintext);
}

/** Generate cryptographically secure random bytes */
export function randomBytes(length: number): Uint8Array {
  return nacl.randomBytes(length);
}
