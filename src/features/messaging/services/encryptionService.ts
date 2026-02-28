// src/features/messaging/services/encryptionService.ts
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import {MESSAGE_VERSION} from '../../../core/solana/constants';

export interface EncryptedPayload {
  version: number;
  senderEncPubKey: Uint8Array; // 32 bytes
  recipientEncPubKey: Uint8Array; // 32 bytes
  nonce: Uint8Array; // 24 bytes
  ciphertext: Uint8Array; // variable length
  timestamp: number; // Unix ms
}

/** Encrypt a plaintext message using NaCl box (X25519 + XSalsa20-Poly1305) */
export function encryptMessage(
  plaintext: string,
  senderSecretKey: Uint8Array, // X25519 secret key
  senderPublicKey: Uint8Array, // X25519 public key
  recipientPublicKey: Uint8Array, // X25519 public key
): EncryptedPayload {
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

  return {
    version: MESSAGE_VERSION,
    senderEncPubKey: senderPublicKey,
    recipientEncPubKey: recipientPublicKey,
    nonce,
    ciphertext,
    timestamp: Date.now(),
  };
}

/**
 * Serialize encrypted payload to base64 string for Memo instruction.
 *
 * Wire format:
 * [version:1B][senderPK:32B][recipientPK:32B][nonce:24B][ciphertext:varB][timestamp:8B]
 */
export function serializePayload(payload: EncryptedPayload): string {
  const timestampBytes = new Uint8Array(8);
  const view = new DataView(timestampBytes.buffer);
  view.setFloat64(0, payload.timestamp, false); // big-endian

  const totalLength =
    1 + // version
    32 + // sender enc pubkey
    32 + // recipient enc pubkey
    24 + // nonce
    payload.ciphertext.length + // ciphertext (includes 16-byte MAC)
    8; // timestamp

  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  buffer[offset++] = payload.version;
  buffer.set(payload.senderEncPubKey, offset);
  offset += 32;
  buffer.set(payload.recipientEncPubKey, offset);
  offset += 32;
  buffer.set(payload.nonce, offset);
  offset += 24;
  buffer.set(payload.ciphertext, offset);
  offset += payload.ciphertext.length;
  buffer.set(timestampBytes, offset);

  return naclUtil.encodeBase64(buffer);
}

/** Deserialize and decrypt a message from a base64-encoded Memo payload */
export function decryptMessage(
  serializedPayload: string,
  recipientSecretKey: Uint8Array, // X25519 secret key
): {plaintext: string; senderEncPubKey: Uint8Array; timestamp: number} {
  const buffer = naclUtil.decodeBase64(serializedPayload);
  let offset = 0;

  const version = buffer[offset++];
  if (version !== MESSAGE_VERSION) {
    throw new Error(`Unsupported message version: ${version}`);
  }

  const senderEncPubKey = buffer.slice(offset, offset + 32);
  offset += 32;
  const _recipientEncPubKey = buffer.slice(offset, offset + 32);
  offset += 32;
  const nonce = buffer.slice(offset, offset + 24);
  offset += 24;
  const ciphertext = buffer.slice(offset, buffer.length - 8);
  const timestampBytes = buffer.slice(buffer.length - 8);

  const timestampView = new DataView(
    timestampBytes.buffer,
    timestampBytes.byteOffset,
  );
  const timestamp = timestampView.getFloat64(0, false);

  const plaintext = nacl.box.open(
    ciphertext,
    nonce,
    senderEncPubKey,
    recipientSecretKey,
  );

  if (!plaintext) {
    throw new Error('Decryption failed — wrong key or tampered message');
  }

  return {
    plaintext: naclUtil.encodeUTF8(plaintext),
    senderEncPubKey,
    timestamp,
  };
}
