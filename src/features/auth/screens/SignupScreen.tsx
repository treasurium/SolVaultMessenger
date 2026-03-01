/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/auth/screens/SignupScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, Alert, ScrollView} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Button, Input} from '../../../shared/components';
import {useWalletStore} from '../../../stores/walletStore';
import {validateMnemonic} from '../../wallet/services/mnemonicService';
import type {OnboardingStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Signup'>;

export default function SignupScreen({navigation}: Props) {
  const [mnemonic, setMnemonic] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importWallet = useWalletStore(s => s.importWallet);

  const handleImport = async () => {
    setError(null);

    const trimmed = mnemonic.trim().toLowerCase();
    const words = trimmed.split(/\s+/);

    if (words.length !== 12) {
      setError('Please enter exactly 12 words');
      return;
    }

    if (!validateMnemonic(trimmed)) {
      setError('Invalid recovery phrase. Please check your words.');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }

    try {
      setIsLoading(true);
      await importWallet(trimmed);
      // Wallet is now initialized, navigation will switch to main app
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Import Wallet</Text>
        <Text style={styles.description}>
          Enter your 12-word recovery phrase to restore your wallet.
        </Text>

        <Input
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />

        <Input
          label="Recovery Phrase"
          placeholder="Enter your 12 words separated by spaces"
          value={mnemonic}
          onChangeText={setMnemonic}
          multiline
          numberOfLines={3}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.mnemonicInput}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title="Import Wallet"
          onPress={handleImport}
          loading={isLoading}
          disabled={!mnemonic.trim() || !displayName.trim()}
        />

        <Button
          title="Go Back"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#A0A0B8',
    marginBottom: 32,
    lineHeight: 22,
  },
  mnemonicInput: {
    marginBottom: 24,
  },
  error: {
    color: '#FF4D4D',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 12,
  },
});
