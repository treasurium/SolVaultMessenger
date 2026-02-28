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
  SendSol: {recipientAddress?: string};
};

export type ChatStackParamList = {
  ChatList: undefined;
  Conversation: {peerAddress: string; peerName?: string};
};

export type MainTabParamList = {
  WalletTab: undefined;
  ChatTab: undefined;
  SettingsTab: undefined;
};

/** User model from backend */
export interface User {
  userId: string;
  solanaAddress: string;
  encryptionPubKey: string;
  displayName: string;
  registeredAt: string;
}

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
