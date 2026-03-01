/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/core/storage/secureStorage.ts
import * as Keychain from 'react-native-keychain';
import {Platform} from 'react-native';

const SERVICE_NAME = 'com.solvault.messenger';

export async function secureStore(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(key, value, {
    service: `${SERVICE_NAME}.${key}`,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    ...(Platform.OS === 'android' && {
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    }),
  });
}

export async function secureRetrieve(key: string): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}.${key}`,
    });
    if (result && result.password) {
      return result.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function secureDelete(key: string): Promise<void> {
  await Keychain.resetGenericPassword({
    service: `${SERVICE_NAME}.${key}`,
  });
}

export async function hasSecureValue(key: string): Promise<boolean> {
  const value = await secureRetrieve(key);
  return value !== null;
}
