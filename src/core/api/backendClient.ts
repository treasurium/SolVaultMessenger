// src/core/api/backendClient.ts
// REST client for the lightweight backend (user directory, push, tx relay)

import {ENV} from '../../config/env';
import {secureRetrieve} from '../storage/secureStorage';

const AUTH_TOKEN_KEY = 'solvault_auth_token';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await secureRetrieve(AUTH_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  const url = `${ENV.BACKEND_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  return response.json();
}

// --- Auth ---

export interface AuthResponse {
  userId: string;
  token: string;
  refreshToken: string;
}

export async function signup(params: {
  email?: string;
  phone?: string;
  displayName: string;
  solanaAddress: string;
  encryptionPubKey: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function login(params: {
  solanaAddress: string;
  signature: string; // sign a challenge to prove key ownership
  challenge: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getLoginChallenge(
  solanaAddress: string,
): Promise<{challenge: string}> {
  return request<{challenge: string}>(
    `/auth/challenge?address=${solanaAddress}`,
  );
}

// --- User Directory ---

export interface UserRecord {
  userId: string;
  solanaAddress: string;
  encryptionPubKey: string;
  displayName: string;
  registeredAt: string;
}

export async function lookupUser(
  solanaAddress: string,
): Promise<UserRecord | null> {
  try {
    return await request<UserRecord>(`/users/${solanaAddress}`);
  } catch {
    return null;
  }
}

export async function searchUsers(query: string): Promise<UserRecord[]> {
  return request<UserRecord[]>(
    `/users/search?q=${encodeURIComponent(query)}`,
  );
}

export async function updateEncryptionKey(
  encryptionPubKey: string,
): Promise<void> {
  await request('/users/me/encryption-key', {
    method: 'PUT',
    body: JSON.stringify({encryptionPubKey}),
  });
}

// --- Message Relay (tx signature delivery) ---

export async function relayTxSignature(params: {
  recipientAddress: string;
  txSignature: string;
  senderAddress: string;
}): Promise<void> {
  await request('/messages/relay', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getPendingSignatures(): Promise<
  Array<{txSignature: string; senderAddress: string; relayedAt: string}>
> {
  return request('/messages/pending');
}

export async function acknowledgeSigature(txSignature: string): Promise<void> {
  await request(`/messages/ack/${txSignature}`, {method: 'POST'});
}

// --- Push Notifications ---

export async function registerPushToken(params: {
  token: string;
  platform: 'ios' | 'android';
}): Promise<void> {
  await request('/push/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
