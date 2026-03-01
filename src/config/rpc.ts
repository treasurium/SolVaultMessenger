/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/config/rpc.ts
// Decentralized RPC configuration — multiple fallback endpoints.
// If one is blocked, the app automatically tries the next.
// Users can also configure their own private RPC endpoint in Settings.

export interface RPCConfig {
  endpoint: string;
  wsEndpoint?: string;
  label: string;
}

export const MAINNET_RPCS: RPCConfig[] = [
  {
    endpoint: 'https://api.mainnet-beta.solana.com',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com',
    label: 'Solana Public',
  },
  {
    endpoint: 'https://rpc.ankr.com/solana',
    label: 'Ankr',
  },
  {
    endpoint: 'https://solana.public-rpc.com',
    label: 'Public RPC',
  },
];

export const DEVNET_RPCS: RPCConfig[] = [
  {
    endpoint: 'https://api.devnet.solana.com',
    wsEndpoint: 'wss://api.devnet.solana.com',
    label: 'Devnet Public',
  },
];
