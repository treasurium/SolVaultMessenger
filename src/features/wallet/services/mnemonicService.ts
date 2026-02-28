// src/features/wallet/services/mnemonicService.ts
import * as bip39 from 'bip39';
import {
  secureStore,
  secureRetrieve,
  secureDelete,
} from '../../../core/storage/secureStorage';

const MNEMONIC_KEY = 'sol_vault_mnemonic';

/** Generate a new 12-word BIP39 mnemonic (128 bits entropy) */
export function generateMnemonic(): string {
  return bip39.generateMnemonic(128);
}

/** Validate a mnemonic phrase */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/** Encrypt and store mnemonic in Keychain/Keystore */
export async function storeMnemonic(mnemonic: string): Promise<void> {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  await secureStore(MNEMONIC_KEY, mnemonic);
}

/** Retrieve mnemonic from secure storage */
export async function retrieveMnemonic(): Promise<string | null> {
  return secureRetrieve(MNEMONIC_KEY);
}

/** Delete mnemonic from secure storage (for wallet reset) */
export async function deleteMnemonic(): Promise<void> {
  await secureDelete(MNEMONIC_KEY);
}

/** Convert mnemonic to 512-bit seed */
export async function mnemonicToSeed(mnemonic: string): Promise<Buffer> {
  return bip39.mnemonicToSeed(mnemonic);
}

/** Check if a wallet mnemonic exists in secure storage */
export async function hasMnemonic(): Promise<boolean> {
  const mnemonic = await retrieveMnemonic();
  return mnemonic !== null;
}
