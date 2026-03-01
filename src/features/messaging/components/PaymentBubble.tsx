/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/components/PaymentBubble.tsx
import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet, Linking} from 'react-native';
import {formatTokenAmount, formatTime, getExplorerUrl} from '../../../shared/utils/format';
import type {TokenSymbol} from '../../../core/solana/constants';
import {TOKEN_LOGOS} from '../../../core/solana/constants';

interface PaymentData {
  type: 'payment';
  token: TokenSymbol;
  amount: string;
  txSignature: string;
}

interface PaymentBubbleProps {
  payment: PaymentData;
  isMine: boolean;
  timestamp: number;
  isDevnet: boolean;
}

export default function PaymentBubble({
  payment,
  isMine,
  timestamp,
  isDevnet,
}: PaymentBubbleProps) {
  const logoUrl = TOKEN_LOGOS[payment.token] ?? TOKEN_LOGOS.SOL;
  const amount = parseFloat(payment.amount) || 0;

  const handleTxPress = () => {
    if (payment.txSignature) {
      const url = getExplorerUrl(payment.txSignature, isDevnet);
      Linking.openURL(url);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isMine ? styles.myPayment : styles.theirPayment,
      ]}>
      <View style={styles.header}>
        <Image source={{uri: logoUrl}} style={styles.tokenLogo} />
        <Text style={styles.label}>
          {isMine ? 'Payment Sent' : 'Payment Received'}
        </Text>
      </View>

      <Text style={styles.amount}>
        {formatTokenAmount(amount, payment.token)} {payment.token}
      </Text>

      {payment.txSignature && (
        <TouchableOpacity
          onPress={handleTxPress}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={styles.txLink}>
            View on Explorer →
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.time}>{formatTime(timestamp)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#14F195',
    backgroundColor: '#0D1A14',
  },
  myPayment: {
    alignSelf: 'flex-end',
  },
  theirPayment: {
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tokenLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  label: {
    color: '#14F195',
    fontSize: 13,
    fontWeight: '600',
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  txLink: {
    color: '#14F195',
    fontSize: 12,
    textDecorationLine: 'underline',
    marginBottom: 6,
  },
  time: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'right',
  },
});
