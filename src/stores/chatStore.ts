/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/stores/chatStore.ts
import {create} from 'zustand';
import {
  sendMessage,
  processTransaction,
  fetchAllNewMessages,
  fetchOnChainMessages,
  sendReadReceipts,
  type ProcessedTxResult,
} from '../features/messaging/services/messageService';
import {
  startGlobalListener,
  stopGlobalListener,
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
  isGlobalListenerActive: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (recipientAddress: string, plaintext: string) => Promise<void>;
  fetchNewMessages: (peerAddress: string) => Promise<void>;
  fetchAllMessages: () => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  clearError: () => void;

  // Global listener
  startListener: (myAddress: string) => Promise<void>;
  stopListener: () => Promise<void>;
  reconnectListener: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentMessages: [],
  currentConversationId: null,
  isSending: false,
  isLoadingMessages: false,
  isLoadingConversations: false,
  isFetchingOnChain: false,
  isGlobalListenerActive: false,
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

  /** Fetch messages for a specific conversation (peer-specific scan) */
  fetchNewMessages: async (peerAddress: string) => {
    const {isFetchingOnChain} = get();
    if (isFetchingOnChain) return;

    try {
      set({isFetchingOnChain: true});

      await fetchOnChainMessages(peerAddress);

      get().loadMessages(peerAddress);
      get().loadConversations();

      set({isFetchingOnChain: false});
    } catch (err: any) {
      set({isFetchingOnChain: false});
      console.warn('Failed to fetch on-chain messages:', err.message);
    }
  },

  /** Global catch-up: fetch ALL new messages across all conversations */
  fetchAllMessages: async () => {
    const {isFetchingOnChain} = get();
    if (isFetchingOnChain) return;

    try {
      set({isFetchingOnChain: true});

      const affectedPeers = await fetchAllNewMessages();

      // Refresh UI if any new messages were found
      if (affectedPeers.length > 0) {
        get().loadConversations();

        // If we're currently viewing a conversation that was affected, refresh + mark read
        const currentId = get().currentConversationId;
        if (currentId && affectedPeers.includes(currentId)) {
          get().loadMessages(currentId);
          markConversationRead(currentId).catch(() => {});
          sendReadReceipts(currentId).catch(err =>
            console.warn('Catch-up read receipt failed:', err),
          );
        }
      }

      set({isFetchingOnChain: false});
    } catch (err: any) {
      set({isFetchingOnChain: false});
      console.warn('Failed to fetch all messages:', err.message);
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

  /**
   * Start the global WebSocket listener on the user's wallet address.
   * Should be called once on app launch after wallet is loaded.
   * Detects ALL incoming memo transactions across every conversation.
   */
  startListener: async (myAddress: string) => {
    // First, do a catch-up scan for any messages missed while app was closed
    get().fetchAllMessages();

    // Then start the real-time WebSocket listener
    await startGlobalListener(myAddress, async (txSignature: string) => {
      if (!txSignature) {
        // Empty signature = fallback poll trigger
        get().fetchAllMessages();
        return;
      }

      // Process the specific transaction detected by WebSocket
      const result: ProcessedTxResult | null = await processTransaction(txSignature);

      if (result) {
        // Refresh the conversations list (new message count, preview)
        get().loadConversations();

        // If we're currently viewing this conversation, refresh messages
        const currentId = get().currentConversationId;
        if (currentId === result.peerAddress) {
          get().loadMessages(currentId);

          // Auto-send read receipt for incoming messages in the active conversation
          if (result.type === 'incoming_message') {
            markConversationRead(currentId).catch(() => {});
            sendReadReceipts(currentId).catch(err =>
              console.warn('Auto read receipt failed:', err),
            );
          }
        }
      }
    });

    set({isGlobalListenerActive: true});
  },

  /** Stop the global listener (e.g. on logout) */
  stopListener: async () => {
    await stopGlobalListener();
    set({isGlobalListenerActive: false});
  },

  /** Reconnect WebSocket after app comes to foreground */
  reconnectListener: async () => {
    const shouldPoll = await reconnectIfNeeded();
    if (shouldPoll) {
      // Catch up on any messages missed while backgrounded
      get().fetchAllMessages();
    }
  },

  setCurrentConversation: (id: string | null) => {
    set({currentConversationId: id});
  },

  clearError: () => set({error: null}),
}));
