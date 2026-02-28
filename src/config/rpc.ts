// src/config/rpc.ts

export interface RPCConfig {
  endpoint: string;
  wsEndpoint?: string;
  label: string;
}

export const MAINNET_RPCS: RPCConfig[] = [
  {
    endpoint: 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY',
    wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY',
    label: 'Helius',
  },
  {
    endpoint: 'https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY',
    wsEndpoint: 'wss://solana-mainnet.g.alchemy.com/v2/YOUR_KEY',
    label: 'Alchemy',
  },
  {
    endpoint: 'https://api.mainnet-beta.solana.com',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com',
    label: 'Public',
  },
];

export const DEVNET_RPCS: RPCConfig[] = [
  {
    endpoint: 'https://api.devnet.solana.com',
    wsEndpoint: 'wss://api.devnet.solana.com',
    label: 'Devnet Public',
  },
];
