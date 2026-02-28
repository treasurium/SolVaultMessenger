// src/core/storage/database.ts
// Encrypted local SQLite database for chat history using SQLCipher

import {open, type QuickSQLiteConnection} from 'react-native-quick-sqlite';
import {secureRetrieve, secureStore} from './secureStorage';
import 'react-native-get-random-values';

const DB_NAME = 'solvault_chat.db';
const DB_KEY_STORAGE_KEY = 'solvault_db_encryption_key';

let db: QuickSQLiteConnection | null = null;

async function getOrCreateDbKey(): Promise<string> {
  let key = await secureRetrieve(DB_KEY_STORAGE_KEY);
  if (!key) {
    // Generate a random 256-bit key, hex-encoded
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    key = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    await secureStore(DB_KEY_STORAGE_KEY, key);
  }
  return key;
}

export async function getDatabase(): Promise<QuickSQLiteConnection> {
  if (db) {
    return db;
  }

  const encryptionKey = await getOrCreateDbKey();

  db = open({
    name: DB_NAME,
    encryptionKey,
  });

  // Create tables
  db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      recipient_address TEXT NOT NULL,
      plaintext TEXT NOT NULL,
      tx_signature TEXT UNIQUE,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      read_status TEXT NOT NULL DEFAULT 'sent',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, timestamp DESC);
  `);

  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_tx_signature
    ON messages (tx_signature);
  `);

  // Add read_status column if migrating from old schema
  try {
    db.execute(`ALTER TABLE messages ADD COLUMN read_status TEXT NOT NULL DEFAULT 'sent'`);
  } catch {
    // Column already exists
  }

  db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      peer_address TEXT NOT NULL UNIQUE,
      peer_name TEXT,
      peer_enc_pubkey TEXT,
      last_message_text TEXT,
      last_message_time INTEGER,
      unread_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_conversations_last_message
    ON conversations (last_message_time DESC);
  `);

  // Read receipt tracking: which tx signatures we've already sent receipts for
  db.execute(`
    CREATE TABLE IF NOT EXISTS read_receipts_sent (
      tx_signature TEXT NOT NULL,
      peer_address TEXT NOT NULL,
      sent_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      PRIMARY KEY (tx_signature, peer_address)
    );
  `);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// --- Message CRUD ---

export interface StoredMessage {
  id: string;
  conversation_id: string;
  sender_address: string;
  recipient_address: string;
  plaintext: string;
  tx_signature: string | null;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  read_status: 'sent' | 'delivered' | 'read';
}

export async function insertMessage(msg: StoredMessage): Promise<void> {
  const database = await getDatabase();
  database.execute(
    `INSERT OR IGNORE INTO messages (id, conversation_id, sender_address, recipient_address, plaintext, tx_signature, timestamp, status, read_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      msg.id,
      msg.conversation_id,
      msg.sender_address,
      msg.recipient_address,
      msg.plaintext,
      msg.tx_signature,
      msg.timestamp,
      msg.status,
      msg.read_status ?? 'sent',
    ],
  );
}

export async function getMessages(
  conversationId: string,
  limit = 50,
  offset = 0,
): Promise<StoredMessage[]> {
  const database = await getDatabase();
  const result = database.execute(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    [conversationId, limit, offset],
  );
  return (result.rows?._array ?? []) as StoredMessage[];
}

export async function getMessageByTxSignature(
  txSignature: string,
): Promise<StoredMessage | null> {
  const database = await getDatabase();
  const result = database.execute(
    'SELECT * FROM messages WHERE tx_signature = ? LIMIT 1',
    [txSignature],
  );
  const rows = result.rows?._array ?? [];
  return rows.length > 0 ? (rows[0] as StoredMessage) : null;
}

export async function updateMessageStatus(
  id: string,
  status: string,
  txSignature?: string,
): Promise<void> {
  const database = await getDatabase();
  if (txSignature) {
    database.execute(
      'UPDATE messages SET status = ?, tx_signature = ? WHERE id = ?',
      [status, txSignature, id],
    );
  } else {
    database.execute('UPDATE messages SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
  }
}

export async function updateMessageReadStatus(
  txSignature: string,
  readStatus: 'sent' | 'delivered' | 'read',
): Promise<void> {
  const database = await getDatabase();
  database.execute(
    'UPDATE messages SET read_status = ? WHERE tx_signature = ?',
    [readStatus, txSignature],
  );
}

export async function getUnreadMessagesForConversation(
  conversationId: string,
  myAddress: string,
): Promise<StoredMessage[]> {
  const database = await getDatabase();
  const result = database.execute(
    `SELECT * FROM messages
     WHERE conversation_id = ?
     AND sender_address != ?
     AND read_status != 'read'
     ORDER BY timestamp ASC`,
    [conversationId, myAddress],
  );
  return (result.rows?._array ?? []) as StoredMessage[];
}

export async function getReadReceiptSentSignatures(
  peerAddress: string,
): Promise<string[]> {
  const database = await getDatabase();
  const result = database.execute(
    'SELECT tx_signature FROM read_receipts_sent WHERE peer_address = ?',
    [peerAddress],
  );
  return (result.rows?._array ?? []).map((r: any) => r.tx_signature);
}

export async function markReadReceiptSent(
  txSignature: string,
  peerAddress: string,
): Promise<void> {
  const database = await getDatabase();
  database.execute(
    'INSERT OR IGNORE INTO read_receipts_sent (tx_signature, peer_address) VALUES (?, ?)',
    [txSignature, peerAddress],
  );
}

// --- Conversation CRUD ---

export interface StoredConversation {
  id: string;
  peer_address: string;
  peer_name: string | null;
  peer_enc_pubkey: string | null;
  last_message_text: string | null;
  last_message_time: number | null;
  unread_count: number;
}

export async function upsertConversation(
  conv: Omit<StoredConversation, 'unread_count'> & {unread_count?: number},
): Promise<void> {
  const database = await getDatabase();
  database.execute(
    `INSERT INTO conversations (id, peer_address, peer_name, peer_enc_pubkey, last_message_text, last_message_time, unread_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       peer_name = COALESCE(excluded.peer_name, peer_name),
       peer_enc_pubkey = COALESCE(excluded.peer_enc_pubkey, peer_enc_pubkey),
       last_message_text = excluded.last_message_text,
       last_message_time = excluded.last_message_time,
       unread_count = COALESCE(excluded.unread_count, unread_count)`,
    [
      conv.id,
      conv.peer_address,
      conv.peer_name,
      conv.peer_enc_pubkey,
      conv.last_message_text,
      conv.last_message_time,
      conv.unread_count ?? 0,
    ],
  );
}

export async function getConversations(): Promise<StoredConversation[]> {
  const database = await getDatabase();
  const result = database.execute(
    'SELECT * FROM conversations ORDER BY last_message_time DESC',
  );
  return (result.rows?._array ?? []) as StoredConversation[];
}

export async function markConversationRead(id: string): Promise<void> {
  const database = await getDatabase();
  database.execute('UPDATE conversations SET unread_count = 0 WHERE id = ?', [
    id,
  ]);
}
