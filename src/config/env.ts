// src/config/env.ts

export const ENV = {
  // Backend URL for user directory, push notifications, tx signature relay
  BACKEND_URL: __DEV__
    ? 'http://localhost:3000/api'
    : 'https://api.solvault.app/api',

  // Default to devnet in development
  USE_DEVNET: __DEV__,

  // Balance polling interval (ms)
  BALANCE_POLL_INTERVAL: 15_000,

  // Transaction confirmation timeout (ms)
  TX_CONFIRM_TIMEOUT: 30_000,

  // Max message retries
  MAX_TX_RETRIES: 3,
};
