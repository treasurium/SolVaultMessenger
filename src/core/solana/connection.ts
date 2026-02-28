// src/core/solana/connection.ts
import {Connection, Commitment} from '@solana/web3.js';
import {MAINNET_RPCS, DEVNET_RPCS} from '../../config/rpc';

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

  const rpcs = isDevnet ? DEVNET_RPCS : MAINNET_RPCS;

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

/** Invalidate cached connection (e.g. on network error) */
export function resetConnection(): void {
  cachedConnection = null;
}
