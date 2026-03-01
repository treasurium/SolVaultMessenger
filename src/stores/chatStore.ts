/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/stores/chatStore.ts
import {create} from 'zustand';
import {
  sendMessage,
  fetchOnChainMessages,
  sendReadReceipts,
} from '../features/messaging/services/messageService';
import {
  subscribeToConversation,
  unsubscribeAll,
  reconnectIfNeeded,
} from '../features/messaging/services/subscriptionService';
import {
  getConversations,
  getMessages,
  markConversationRead,
  type StoredConversation,
  type StoredMessage,
} from '../core/storage/database';

interface ChatState {
  // State
  conversations: StoredConversation[];
  currentMessages: StoredMessage[];
  currentConversationId: string | null;
  isSending: boolean;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  isFetchingOnChain: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (recipientAddress: string, plaintext: string) => Promise<void>;
  fetchNewMessages: (peerAddress: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  clearError: () => void;
  subscribeToChat: (myAddress: string, peerAddress: string) => Promise<void>;
  unsubscribeFromChat: () => Promise<void>;
  reconnectChat: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentMessages: [],
  currentConversationId: null,
  isSending: false,
  isLoadingMessages: false,
  isLoadingConversations: false,
  isFetchingOnChain: false,
  error: null,

  loadConversations: async () => {
    try {
      set({isLoadingConversations: true});
      const conversations = await getConversations();
      set({conversations, isLoadingConversations: false});
    } catch (err: any) {
      set({isLoadingConversations: false, error: err.message});
    }
  },

  loadMessages: async (conversationId: string) => {
    try {
      set({isLoadingMessages: true, currentConversationId: conversationId});
      const messages = await getMessages(conversationId);

      // Merge with any optimistic messages still pending
      const current = get().currentMessages;
      const optimistic = current.filter(
        m => m.status === 'pending' && !messages.some(db => db.id === m.id),
      );

      set({
        currentMessages: [...messages, ...optimistic],
        isLoadingMessages: false,
      });
    } catch (err: any) {
      set({isLoadingMessages: false, error: err.message});
    }
  },

  sendMessage: async (recipientAddress: string, plaintext: string) => {
    // Optimistic: add a pending message to the UI immediately
    const optimisticId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMessage: StoredMessage = {
      id: optimisticId,
      conversation_id: recipientAddress,
      sender_address: '_self_', // Will be replaced on refresh
      recipient_address: recipientAddress,
      plaintext,
      tx_signature: null,
      timestamp: Date.now(),
      status: 'pending',
      read_status: 'sent',
      message_type: 'text',
    };

    const current = get().currentMessages;
    set({
      isSending: true,
      error: null,
      currentMessages: [...current, optimisticMessage],
    });

    try {
      await sendMessage(recipientAddress, plaintext);

      set({isSending: false});

      // Remove optimistic message and reload confirmed messages
      const {currentConversationId} = get();
      if (currentConversationId) {
        get().loadMessages(currentConversationId);
      }
      get().loadConversations();
    } catch (err: any) {
      // Remove the optimistic message on failure
      set(state => ({
        isSending: false,
        error: err.message,
        currentMessages: state.currentMessages.filter(m => m.id !== optimisticId),
      }));
      throw err;
    }
  },

  fetchNewMessages: async (peerAddress: string) => {
    const {isFetchingOnChain} = get();
    if (isFetchingOnChain) return; // Prevent concurrent fetches

    try {
      set({isFetchingOnChain: true});

      // Fetch messages from on-chain transaction history
      await fetchOnChainMessages(peerAddress);

      // Refresh local messages list
      get().loadMessages(peerAddress);
      get().loadConversations();

      set({isFetchingOnChain: false});
    } catch (err: any) {
      set({isFetchingOnChain: false});
      console.warn('Failed to fetch on-chain messages:', err.message);
    }
  },

  markRead: async (conversationId: string) => {
    try {
      await markConversationRead(conversationId);
      get().loadConversations();

      // Send read receipts on-chain (fire-and-forget)
      sendReadReceipts(conversationId).catch(err =>
        console.warn('Read receipt failed:', err),
      );
    } catch (err: any) {
      console.warn('Failed to mark conversation read:', err.message);
    }
  },

  /** Subscribe to WebSocket logs for real-time message detection */
  subscribeToChat: async (myAddress: string, peerAddress: string) => {
    await subscribeToConversation(myAddress, peerAddress, () => {
      // When a new memo tx is detected, fetch and decrypt it
      get().fetchNewMessages(peerAddress);
    });
  },

  /** Unsubscribe from WebSocket logs */
  unsubscribeFromChat: async () => {
    await unsubscribeAll();
  },

  /** Reconnect WebSocket after app foreground */
  reconnectChat: async () => {
    await reconnectIfNeeded();
  },

  setCurrentConversation: (id: string | null) => {
    set({currentConversationId: id});
  },

  clearError: () => set({error: null}),
}));
