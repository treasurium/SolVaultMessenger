/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// Global type augmentations for React Native polyfills

import {Buffer as BufferType} from 'buffer';

declare global {
  var Buffer: typeof BufferType;
}

export {};
