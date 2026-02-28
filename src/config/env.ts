// src/config/env.ts

export const ENV = {
  // Backend URL for user directory, push notifications, tx signature relay
  BACKEND_URL: 'https://web-production-d5496.up.railway.app/api',

  // Set to false for mainnet
  USE_DEVNET: false,

  // Balance polling interval (ms)
  BALANCE_POLL_INTERVAL: 15_000,

  // Transaction confirmation timeout (ms)
  TX_CONFIRM_TIMEOUT: 30_000,

  // Max message retries
  MAX_TX_RETRIES: 3,
};
