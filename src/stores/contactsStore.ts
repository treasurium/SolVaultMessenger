/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/stores/contactsStore.ts
import {create} from 'zustand';
import {
  getContacts,
  upsertContact,
  deleteContact,
  getAllContactsMap,
  type StoredContact,
} from '../core/storage/database';

interface ContactsState {
  contacts: StoredContact[];
  contactNameMap: Map<string, string>;
  isLoading: boolean;

  loadContacts: () => Promise<void>;
  addContact: (walletAddress: string, displayName: string) => Promise<void>;
  updateContact: (walletAddress: string, displayName: string) => Promise<void>;
  removeContact: (walletAddress: string) => Promise<void>;
  resolveAddress: (address: string) => string | null;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  contactNameMap: new Map(),
  isLoading: false,

  loadContacts: async () => {
    try {
      set({isLoading: true});
      const contacts = await getContacts();
      const contactNameMap = await getAllContactsMap();
      set({contacts, contactNameMap, isLoading: false});
    } catch (err: any) {
      set({isLoading: false});
      console.warn('Failed to load contacts:', err.message);
    }
  },

  addContact: async (walletAddress: string, displayName: string) => {
    await upsertContact(walletAddress, displayName);
    get().loadContacts();
  },

  updateContact: async (walletAddress: string, displayName: string) => {
    await upsertContact(walletAddress, displayName);
    get().loadContacts();
  },

  removeContact: async (walletAddress: string) => {
    await deleteContact(walletAddress);
    get().loadContacts();
  },

  resolveAddress: (address: string): string | null => {
    return get().contactNameMap.get(address) ?? null;
  },
}));
