/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/config/env.ts
// Fully decentralized — no backend dependency. Only Solana RPC nodes.

export const ENV = {
  // Set to false for mainnet
  USE_DEVNET: false,

  // Balance polling interval (ms)
  BALANCE_POLL_INTERVAL: 15_000,

  // Transaction confirmation timeout (ms)
  TX_CONFIRM_TIMEOUT: 30_000,

  // Max message retries
  MAX_TX_RETRIES: 3,
};
