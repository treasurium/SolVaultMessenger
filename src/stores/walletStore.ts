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

interface WalletState {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  publicKey: string | null;
  balance: number;
  balanceLoading: boolean;
  transactions: TransactionRecord[];
  encryptionPubKeyBase64: string | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  createWallet: () => Promise<string>; // returns mnemonic
  importWallet: (mnemonic: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  sendSol: (recipientAddress: string, amount: number) => Promise<SendSolResult>;
  getKeypair: () => Promise<Keypair | null>;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isInitialized: false,
  isLoading: true,
  publicKey: null,
  balance: 0,
  balanceLoading: false,
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

      // Try to load existing keypair
      let keypair = await getWalletKeypair();
      if (!keypair) {
        // Re-derive from mnemonic
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

      // Ensure encryption keypair exists
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

      // Fetch balance in background
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
    if (!publicKey) {
      return;
    }

    try {
      set({balanceLoading: true});
      const balance = await getBalance(new PublicKey(publicKey));
      set({balance, balanceLoading: false});
    } catch (err: any) {
      set({balanceLoading: false, error: err.message});
    }
  },

  refreshTransactions: async () => {
    const {publicKey} = get();
    if (!publicKey) {
      return;
    }

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
    if (!keypair) {
      throw new Error('Wallet not initialized');
    }

    const result = await sendSol(keypair, recipientAddress, amount);

    // Refresh balance after send
    get().refreshBalance();

    return result;
  },

  getKeypair: async () => {
    return getWalletKeypair();
  },

  clearError: () => set({error: null}),
}));
