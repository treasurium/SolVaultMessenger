/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/shared/types/index.ts

/** Navigation param lists */
export type OnboardingStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  CreateWallet: undefined;
  BackupPhrase: {mnemonic: string};
  ConfirmPhrase: {mnemonic: string};
};

export type WalletStackParamList = {
  WalletHome: undefined;
  Deposit: undefined;
  SendSol: {recipientAddress?: string; token?: import('../core/solana/constants').TokenSymbol};
};

export type ChatStackParamList = {
  ChatList: undefined;
  NewMessage: undefined;
  Conversation: {peerAddress: string; peerName?: string};
};

export type ContactsStackParamList = {
  ContactsList: undefined;
};

export type MainTabParamList = {
  WalletTab: undefined;
  ChatTab: undefined;
  ContactsTab: undefined;
  SettingsTab: undefined;
};

/** Message displayed in chat UI */
export interface ChatMessage {
  id: string;
  text: string;
  senderAddress: string;
  recipientAddress: string;
  timestamp: number;
  txSignature: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  isMine: boolean;
}

/** Conversation in chat list */
export interface Conversation {
  id: string;
  peerAddress: string;
  peerName: string | null;
  lastMessageText: string | null;
  lastMessageTime: number | null;
  unreadCount: number;
}

/** Wallet transaction for history display */
export interface WalletTransaction {
  signature: string;
  type: 'send' | 'receive' | 'message';
  amount: number;
  counterparty: string;
  timestamp: number;
  status: string;
}
