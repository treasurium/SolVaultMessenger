/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/shared/utils/format.ts

/** Truncate a Solana address for display: "7xKX...AsU" */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) {
    return address;
  }
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Format SOL balance with appropriate decimals */
export function formatSol(amount: number): string {
  if (amount === 0) {
    return '0';
  }
  if (amount < 0.001) {
    return amount.toFixed(9);
  }
  if (amount < 1) {
    return amount.toFixed(6);
  }
  return amount.toFixed(4);
}

/** Format lamports to SOL string */
export function lamportsToSol(lamports: number): string {
  return formatSol(lamports / 1_000_000_000);
}

/** Format timestamp to human-readable relative time */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString();
}

/** Format timestamp to time string (HH:MM) */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

/** Format USD value with commas */
export function formatUsd(amount: number): string {
  return (
    '$' +
    amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  );
}

/** Format token amount with appropriate decimals */
export function formatTokenAmount(
  amount: number,
  symbol: 'SOL' | 'USDC' | 'USDT',
): string {
  if (symbol === 'SOL') {
    return formatSol(amount);
  }
  return amount.toFixed(2);
}

/** Get Solana Explorer URL for a transaction */
export function getExplorerUrl(
  signature: string,
  isDevnet: boolean,
): string {
  const cluster = isDevnet ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}
