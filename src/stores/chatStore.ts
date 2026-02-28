// src/stores/chatStore.ts
import {create} from 'zustand';
import {
  sendMessage,
  processIncomingMessage,
} from '../features/messaging/services/messageService';
import {
  getConversations,
  getMessages,
  markConversationRead,
  type StoredConversation,
  type StoredMessage,
} from '../core/storage/database';
import {getPendingSignatures, acknowledgeSigature} from '../core/api/backendClient';

interface ChatState {
  // State
  conversations: StoredConversation[];
  currentMessages: StoredMessage[];
  currentConversationId: string | null;
  isSending: boolean;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (recipientAddress: string, plaintext: string) => Promise<void>;
  checkForNewMessages: () => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentMessages: [],
  currentConversationId: null,
  isSending: false,
  isLoadingMessages: false,
  isLoadingConversations: false,
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
      set({currentMessages: messages, isLoadingMessages: false});
    } catch (err: any) {
      set({isLoadingMessages: false, error: err.message});
    }
  },

  sendMessage: async (recipientAddress: string, plaintext: string) => {
    try {
      set({isSending: true, error: null});

      await sendMessage(recipientAddress, plaintext);

      set({isSending: false});

      // Refresh messages and conversations
      const {currentConversationId} = get();
      if (currentConversationId) {
        get().loadMessages(currentConversationId);
      }
      get().loadConversations();
    } catch (err: any) {
      set({isSending: false, error: err.message});
      throw err;
    }
  },

  checkForNewMessages: async () => {
    try {
      const pending = await getPendingSignatures();

      for (const item of pending) {
        try {
          await processIncomingMessage(item.txSignature, item.senderAddress);
          await acknowledgeSigature(item.txSignature);
        } catch (err) {
          console.warn(
            `Failed to process message ${item.txSignature}:`,
            err,
          );
        }
      }

      // Refresh conversations after processing
      if (pending.length > 0) {
        get().loadConversations();

        const {currentConversationId} = get();
        if (currentConversationId) {
          get().loadMessages(currentConversationId);
        }
      }
    } catch (err: any) {
      console.warn('Failed to check for new messages:', err.message);
    }
  },

  markRead: async (conversationId: string) => {
    try {
      await markConversationRead(conversationId);
      get().loadConversations();
    } catch (err: any) {
      console.warn('Failed to mark conversation read:', err.message);
    }
  },

  setCurrentConversation: (id: string | null) => {
    set({currentConversationId: id});
  },

  clearError: () => set({error: null}),
}));
