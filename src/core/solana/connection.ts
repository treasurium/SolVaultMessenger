/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/core/solana/connection.ts
// Decentralized multi-RPC fallback with custom endpoint support.
// Tries user-configured RPC first, then falls through built-in list.

import {Connection, Commitment} from '@solana/web3.js';
import {MAINNET_RPCS, DEVNET_RPCS, type RPCConfig} from '../../config/rpc';
import {loadCustomRpc} from '../../config/customRpc';

let cachedConnection: Connection | null = null;
let isDevnet = __DEV__;

export function setNetwork(devnet: boolean): void {
  isDevnet = devnet;
  cachedConnection = null; // Force re-creation on next call
}

export function getNetworkLabel(): string {
  return isDevnet ? 'Devnet' : 'Mainnet';
}

export function isDevnetActive(): boolean {
  return isDevnet;
}

export async function getConnection(
  commitment: Commitment = 'confirmed',
): Promise<Connection> {
  if (cachedConnection) {
    return cachedConnection;
  }

  // Build RPC list: custom first (if set), then built-in defaults
  const rpcs: RPCConfig[] = [];

  const customRpc = await loadCustomRpc();
  if (customRpc) {
    rpcs.push(customRpc);
  }

  const defaults = isDevnet ? DEVNET_RPCS : MAINNET_RPCS;
  rpcs.push(...defaults);

  for (const rpc of rpcs) {
    try {
      const conn = new Connection(rpc.endpoint, {
        commitment,
        wsEndpoint: rpc.wsEndpoint,
      });
      await conn.getSlot(); // Health check
      console.log(`[RPC] Connected to ${rpc.label} (ws: ${rpc.wsEndpoint ?? 'auto'})`);
      cachedConnection = conn;
      return conn;
    } catch {
      console.warn(`[RPC] ${rpc.label} unavailable, trying next...`);
      continue;
    }
  }

  throw new Error('All Solana RPC endpoints are unavailable');
}

/** Invalidate cached connection (e.g. on network error or RPC change) */
export function resetConnection(): void {
  cachedConnection = null;
}
