/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/auth/services/biometricService.ts
import * as Keychain from 'react-native-keychain';

const BIOMETRIC_SERVICE = 'com.solvault.messenger.biometric';

/** Check if biometric authentication is available on this device */
export async function isBiometricAvailable(): Promise<boolean> {
  const supportedType = await Keychain.getSupportedBiometryType();
  return supportedType !== null;
}

/** Get the type of biometric available (e.g., 'FaceID', 'TouchID', 'Fingerprint') */
export async function getBiometricType(): Promise<string | null> {
  return Keychain.getSupportedBiometryType();
}

/** Enable biometric lock by storing a sentinel value with biometric protection */
export async function enableBiometricLock(): Promise<boolean> {
  try {
    await Keychain.setGenericPassword('biometric', 'enabled', {
      service: BIOMETRIC_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch {
    return false;
  }
}

/** Disable biometric lock */
export async function disableBiometricLock(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({service: BIOMETRIC_SERVICE});
  } catch {
    // Already disabled or error
  }
}

/** Check if biometric lock is currently enabled */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    // Use hasGenericPassword which doesn't trigger biometric prompt
    const result = await Keychain.hasGenericPassword({
      service: BIOMETRIC_SERVICE,
    });
    return !!result;
  } catch {
    return false;
  }
}

/** Authenticate with biometric — triggers the system prompt */
export async function authenticateWithBiometric(
  prompt: string,
): Promise<boolean> {
  try {
    const result = await Keychain.getGenericPassword({
      service: BIOMETRIC_SERVICE,
      authenticationPrompt: {title: prompt},
    });
    return !!result;
  } catch {
    return false;
  }
}
