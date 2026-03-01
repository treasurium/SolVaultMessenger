/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/components/PaymentModal.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useWalletStore} from '../../../stores/walletStore';
import {formatTokenAmount, formatUsd} from '../../../shared/utils/format';
import type {TokenSymbol} from '../../../core/solana/constants';
import {TOKEN_LOGOS} from '../../../core/solana/constants';

const TOKEN_OPTIONS: TokenSymbol[] = ['SOL', 'USDC', 'USDT'];

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (token: TokenSymbol, amount: number) => Promise<void>;
  peerName: string;
}

export default function PaymentModal({
  visible,
  onClose,
  onSend,
  peerName,
}: PaymentModalProps) {
  const {getTokenBalance, solPrice} = useWalletStore();

  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('SOL');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const tokenBalance = getTokenBalance(selectedToken);

  const usdEquivalent =
    selectedToken === 'SOL' ? parsedAmount * solPrice : parsedAmount;

  const canSend = parsedAmount > 0 && parsedAmount <= tokenBalance;

  const handleMax = () => {
    setAmount(tokenBalance.toString());
  };

  const handleSend = async () => {
    if (!canSend) return;

    Alert.alert(
      'Confirm Payment',
      `Send ${formatTokenAmount(parsedAmount, selectedToken)} ${selectedToken} to ${peerName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Send',
          onPress: async () => {
            try {
              setIsSending(true);
              await onSend(selectedToken, parsedAmount);
              setIsSending(false);
              setAmount('');
              setSelectedToken('SOL');
            } catch (err: any) {
              setIsSending(false);
              Alert.alert('Payment Failed', err.message);
            }
          },
        },
      ],
    );
  };

  const handleClose = () => {
    setAmount('');
    setSelectedToken('SOL');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Send Crypto to {peerName}</Text>

          {/* Token Selector */}
          <View style={styles.tokenSelector}>
            {TOKEN_OPTIONS.map(token => (
              <TouchableOpacity
                key={token}
                style={[
                  styles.tokenCard,
                  selectedToken === token && styles.tokenCardActive,
                ]}
                onPress={() => {
                  setSelectedToken(token);
                  setAmount('');
                }}>
                <Image
                  source={{uri: TOKEN_LOGOS[token]}}
                  style={styles.tokenLogo}
                />
                <Text
                  style={[
                    styles.tokenLabel,
                    selectedToken === token && styles.tokenLabelActive,
                  ]}>
                  {token}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Balance */}
          <Text style={styles.balanceText}>
            Available: {formatTokenAmount(tokenBalance, selectedToken)}{' '}
            {selectedToken}
          </Text>

          {/* Amount Input */}
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#666680"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!isSending}
            />
            <TouchableOpacity style={styles.maxButton} onPress={handleMax}>
              <Text style={styles.maxText}>MAX</Text>
            </TouchableOpacity>
          </View>

          {/* USD Equivalent */}
          {parsedAmount > 0 && (
            <Text style={styles.usdText}>
              {'\u2248'} {formatUsd(usdEquivalent)}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSending}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend || isSending}>
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendText}>
                  Send {selectedToken}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#2A2A3E',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  tokenSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tokenCard: {
    flex: 1,
    backgroundColor: '#2A2A3E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tokenCardActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#2A2A4E',
  },
  tokenLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 6,
  },
  tokenLabel: {
    color: '#A0A0B8',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenLabelActive: {
    color: '#FFFFFF',
  },
  balanceText: {
    color: '#A0A0B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D1A',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 16,
  },
  maxButton: {
    backgroundColor: '#2A2A3E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  maxText: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '700',
  },
  usdText: {
    color: '#A0A0B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#2A2A3E',
    alignItems: 'center',
  },
  cancelText: {
    color: '#A0A0B8',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
