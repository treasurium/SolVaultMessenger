/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/config/customRpc.ts
// Persists user-configured custom RPC endpoint in secure storage.
// Allows users to bypass blocked default RPCs with their own node.

import {secureStore, secureRetrieve, secureDelete} from '../core/storage/secureStorage';
import type {RPCConfig} from './rpc';

const CUSTOM_RPC_KEY = 'solvault_custom_rpc';
const CUSTOM_WSS_KEY = 'solvault_custom_wss';

/** Save user's custom RPC endpoint */
export async function saveCustomRpc(
  endpoint: string,
  wsEndpoint?: string,
): Promise<void> {
  await secureStore(CUSTOM_RPC_KEY, endpoint);
  if (wsEndpoint) {
    await secureStore(CUSTOM_WSS_KEY, wsEndpoint);
  } else {
    await secureDelete(CUSTOM_WSS_KEY);
  }
}

/** Load user's custom RPC config, or null if not set */
export async function loadCustomRpc(): Promise<RPCConfig | null> {
  const endpoint = await secureRetrieve(CUSTOM_RPC_KEY);
  if (!endpoint) return null;

  const wsEndpoint = await secureRetrieve(CUSTOM_WSS_KEY);
  return {
    endpoint,
    wsEndpoint: wsEndpoint ?? undefined,
    label: 'Custom',
  };
}

/** Remove user's custom RPC endpoint */
export async function clearCustomRpc(): Promise<void> {
  await secureDelete(CUSTOM_RPC_KEY);
  await secureDelete(CUSTOM_WSS_KEY);
}
