/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/wallet/screens/DepositScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Button} from '../../../shared/components';
import {useWalletStore} from '../../../stores/walletStore';
import {useAuthStore} from '../../../stores/authStore';
import {shortenAddress} from '../../../shared/utils/format';
import type {WalletStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<WalletStackParamList, 'Deposit'>;

export default function DepositScreen({navigation}: Props) {
  const {publicKey} = useWalletStore();
  const {isDevnet} = useAuthStore();

  const handleCopyAddress = async () => {
    if (!publicKey) {
      return;
    }
    // Note: In production, we'd use @react-native-clipboard/clipboard
    // For now, use Share as a cross-platform alternative
    try {
      await Share.share({
        message: publicKey,
      });
    } catch {
      Alert.alert('Error', 'Could not share address');
    }
  };

  if (!publicKey) {
    return (
      <ScreenContainer>
        <Text style={styles.errorText}>Wallet not initialized</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>Deposit SOL</Text>
        <Text style={styles.description}>
          Send SOL to this address from any wallet or exchange.
        </Text>

        {isDevnet && (
          <View style={styles.devnetBanner}>
            <Text style={styles.devnetBannerText}>
              You're on Devnet. Get free test SOL at sol-faucet.com
            </Text>
          </View>
        )}

        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={`solana:${publicKey}`}
              size={200}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.addressContainer}
          onPress={handleCopyAddress}
          activeOpacity={0.7}>
          <Text style={styles.addressLabel}>Your Solana Address</Text>
          <Text style={styles.address}>{publicKey}</Text>
          <Text style={styles.tapHint}>Tap to share</Text>
        </TouchableOpacity>

        <Button
          title="Share Address"
          onPress={handleCopyAddress}
          style={styles.shareButton}
        />

        <Button
          title="Back to Wallet"
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingVertical: 20,
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
    marginBottom: 20,
    lineHeight: 22,
  },
  devnetBanner: {
    backgroundColor: '#2A1A00',
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  devnetBannerText: {
    color: '#FFB84D',
    fontSize: 13,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  addressContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  addressLabel: {
    color: '#A0A0B8',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  address: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    textAlign: 'center',
    lineHeight: 20,
  },
  tapHint: {
    color: '#6C63FF',
    fontSize: 12,
    marginTop: 8,
  },
  shareButton: {
    marginBottom: 12,
  },
  errorText: {
    color: '#FF4D4D',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
