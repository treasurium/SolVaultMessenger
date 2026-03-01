/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/stores/walletStore.ts
import {create} from 'zustand';
import {Keypair, PublicKey} from '@solana/web3.js';
import {
  generateMnemonic,
  storeMnemonic,
  retrieveMnemonic,
  hasMnemonic,
} from '../features/wallet/services/mnemonicService';
import {
  deriveWalletKeypair,
  storeWalletKeypair,
  getWalletKeypair,
  generateAndStoreEncryptionKeypair,
  getEncryptionKeypair,
  getEncryptionPubKeyBase64,
} from '../features/wallet/services/keypairService';
import {
  getBalance,
  sendSol,
  getRecentTransactions,
  type TransactionRecord,
  type SendSolResult,
} from '../features/wallet/services/transactionService';
import {
  getTokenBalances,
  sendSplToken,
  getMintForToken,
  type TokenBalance,
} from '../features/wallet/services/tokenService';
import {
  type TokenSymbol,
  SUPPORTED_TOKENS,
} from '../core/solana/constants';

interface WalletState {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  publicKey: string | null;
  balance: number;
  balanceLoading: boolean;
  tokenBalances: TokenBalance[];
  totalUsdBalance: number;
  solPrice: number;
  transactions: TransactionRecord[];
  encryptionPubKeyBase64: string | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  createWallet: () => Promise<string>;
  importWallet: (mnemonic: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  sendSol: (recipientAddress: string, amount: number) => Promise<SendSolResult>;
  sendToken: (recipientAddress: string, amount: number, token: TokenSymbol) => Promise<SendSolResult>;
  getKeypair: () => Promise<Keypair | null>;
  getTokenBalance: (symbol: TokenSymbol) => number;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isInitialized: false,
  isLoading: true,
  publicKey: null,
  balance: 0,
  balanceLoading: false,
  tokenBalances: [],
  totalUsdBalance: 0,
  solPrice: 0,
  transactions: [],
  encryptionPubKeyBase64: null,
  error: null,

  initialize: async () => {
    try {
      set({isLoading: true, error: null});

      const hasWallet = await hasMnemonic();
      if (!hasWallet) {
        set({isInitialized: false, isLoading: false});
        return;
      }

      let keypair = await getWalletKeypair();
      if (!keypair) {
        const mnemonic = await retrieveMnemonic();
        if (mnemonic) {
          keypair = await deriveWalletKeypair(mnemonic);
          await storeWalletKeypair(keypair);
        }
      }

      if (!keypair) {
        set({isInitialized: false, isLoading: false});
        return;
      }

      let encKeypair = await getEncryptionKeypair();
      if (!encKeypair) {
        encKeypair = await generateAndStoreEncryptionKeypair();
      }

      const encPubKey = await getEncryptionPubKeyBase64();

      set({
        isInitialized: true,
        isLoading: false,
        publicKey: keypair.publicKey.toString(),
        encryptionPubKeyBase64: encPubKey,
      });

      // Fetch balances in background
      get().refreshBalance();
    } catch (err: any) {
      set({isLoading: false, error: err.message});
    }
  },

  createWallet: async () => {
    try {
      set({isLoading: true, error: null});

      const mnemonic = generateMnemonic();
      await storeMnemonic(mnemonic);

      const keypair = await deriveWalletKeypair(mnemonic);
      await storeWalletKeypair(keypair);

      const encKeypair = await generateAndStoreEncryptionKeypair();
      const encPubKey = Buffer.from(encKeypair.publicKey).toString('base64');

      set({
        isInitialized: true,
        isLoading: false,
        publicKey: keypair.publicKey.toString(),
        encryptionPubKeyBase64: encPubKey,
      });

      return mnemonic;
    } catch (err: any) {
      set({isLoading: false, error: err.message});
      throw err;
    }
  },

  importWallet: async (mnemonic: string) => {
    try {
      set({isLoading: true, error: null});

      await storeMnemonic(mnemonic);
      const keypair = await deriveWalletKeypair(mnemonic);
      await storeWalletKeypair(keypair);

      const encKeypair = await generateAndStoreEncryptionKeypair();
      const encPubKey = Buffer.from(encKeypair.publicKey).toString('base64');

      set({
        isInitialized: true,
        isLoading: false,
        publicKey: keypair.publicKey.toString(),
        encryptionPubKeyBase64: encPubKey,
      });
    } catch (err: any) {
      set({isLoading: false, error: err.message});
      throw err;
    }
  },

  refreshBalance: async () => {
    const {publicKey} = get();
    if (!publicKey) return;

    try {
      set({balanceLoading: true});
      const allBalances = await getTokenBalances(new PublicKey(publicKey));
      const solToken = allBalances.tokens.find(t => t.symbol === 'SOL');
      set({
        balance: solToken?.balance ?? 0,
        tokenBalances: allBalances.tokens,
        totalUsdBalance: allBalances.totalUsd,
        solPrice: allBalances.solPrice,
        balanceLoading: false,
      });
    } catch (err: any) {
      // Fallback to SOL-only balance
      try {
        const balance = await getBalance(new PublicKey(publicKey));
        set({balance, balanceLoading: false});
      } catch {
        set({balanceLoading: false, error: err.message});
      }
    }
  },

  refreshTransactions: async () => {
    const {publicKey} = get();
    if (!publicKey) return;

    try {
      const transactions = await getRecentTransactions(
        new PublicKey(publicKey),
      );
      set({transactions});
    } catch (err: any) {
      set({error: err.message});
    }
  },

  sendSol: async (recipientAddress: string, amount: number) => {
    const keypair = await getWalletKeypair();
    if (!keypair) throw new Error('Wallet not initialized');

    const result = await sendSol(keypair, recipientAddress, amount);
    get().refreshBalance();
    return result;
  },

  sendToken: async (recipientAddress: string, amount: number, token: TokenSymbol) => {
    const keypair = await getWalletKeypair();
    if (!keypair) throw new Error('Wallet not initialized');

    let result: SendSolResult;

    if (token === 'SOL') {
      result = await sendSol(keypair, recipientAddress, amount);
    } else {
      const mint = getMintForToken(token);
      if (!mint) throw new Error(`Unknown token: ${token}`);
      const tokenInfo = SUPPORTED_TOKENS.find(t => t.symbol === token);
      const decimals = tokenInfo?.decimals ?? 6;
      result = await sendSplToken(keypair, recipientAddress, mint, amount, decimals);
    }

    get().refreshBalance();
    return result;
  },

  getKeypair: async () => {
    return getWalletKeypair();
  },

  getTokenBalance: (symbol: TokenSymbol) => {
    const token = get().tokenBalances.find(t => t.symbol === symbol);
    return token?.balance ?? 0;
  },

  clearError: () => set({error: null}),
}));
