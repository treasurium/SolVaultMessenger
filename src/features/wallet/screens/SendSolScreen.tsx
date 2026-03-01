/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/wallet/screens/SendSolScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ScreenContainer,
  Button,
  Input,
  LoadingOverlay,
} from '../../../shared/components';
import {useWalletStore} from '../../../stores/walletStore';
import {useContactsStore} from '../../../stores/contactsStore';
import {isValidSolanaAddress, estimateFee} from '../services/transactionService';
import {
  formatSol,
  formatTokenAmount,
  lamportsToSol,
  shortenAddress,
} from '../../../shared/utils/format';
import type {WalletStackParamList} from '../../../shared/types';
import type {TokenSymbol} from '../../../core/solana/constants';
import {ATA_RENT_LAMPORTS, TOKEN_LOGOS} from '../../../core/solana/constants';

type Props = NativeStackScreenProps<WalletStackParamList, 'SendSol'>;

const TOKEN_OPTIONS: TokenSymbol[] = ['SOL', 'USDC', 'USDT'];

export default function SendSolScreen({navigation, route}: Props) {
  const {balance, sendToken, getTokenBalance, tokenBalances} = useWalletStore();
  const {contacts} = useContactsStore();

  const [selectedToken, setSelectedToken] = useState<TokenSymbol>(
    route.params?.token ?? 'SOL',
  );
  const [recipientAddress, setRecipientAddress] = useState(
    route.params?.recipientAddress ?? '',
  );
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContacts, setShowContacts] = useState(false);

  const fee = estimateFee();
  const parsedAmount = parseFloat(amount) || 0;
  const tokenBalance = getTokenBalance(selectedToken);

  // For SOL: total includes fee. For SPL: fee is separate in SOL
  const isSol = selectedToken === 'SOL';
  const totalCost = isSol ? parsedAmount + fee / 1_000_000_000 : parsedAmount;
  const hasSufficientSolForFee = isSol || balance >= fee / 1_000_000_000;

  const canSend =
    recipientAddress.trim() &&
    parsedAmount > 0 &&
    totalCost <= tokenBalance &&
    hasSufficientSolForFee &&
    isValidSolanaAddress(recipientAddress.trim());

  const handleSend = async () => {
    setError(null);

    if (!isValidSolanaAddress(recipientAddress.trim())) {
      setError('Invalid Solana address');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Amount must be positive');
      return;
    }
    if (totalCost > tokenBalance) {
      setError('Insufficient balance');
      return;
    }
    if (!hasSufficientSolForFee) {
      setError('Insufficient SOL for network fee');
      return;
    }

    const confirmMsg = isSol
      ? `Send ${formatTokenAmount(parsedAmount, selectedToken)} SOL?\n\nTo: ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-4)}\nFee: ${lamportsToSol(fee)} SOL`
      : `Send ${formatTokenAmount(parsedAmount, selectedToken)} ${selectedToken}?\n\nTo: ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-4)}\nFee: ~${lamportsToSol(fee)} SOL (paid in SOL)`;

    Alert.alert('Confirm Transaction', confirmMsg, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Send',
        onPress: async () => {
          try {
            setIsSending(true);
            const result = await sendToken(
              recipientAddress.trim(),
              parsedAmount,
              selectedToken,
            );
            setIsSending(false);

            Alert.alert(
              'Transaction Sent!',
              `Signature: ${result.signature.slice(0, 16)}...`,
              [{text: 'Done', onPress: () => navigation.goBack()}],
            );
          } catch (err: any) {
            setIsSending(false);
            setError(err.message);
          }
        },
      },
    ]);
  };

  const handleMaxAmount = () => {
    if (isSol) {
      const maxSol = Math.max(0, tokenBalance - fee / 1_000_000_000);
      setAmount(maxSol.toString());
    } else {
      setAmount(tokenBalance.toString());
    }
  };

  const handleSelectContact = (address: string) => {
    setRecipientAddress(address);
    setShowContacts(false);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Send {selectedToken}</Text>

          {/* Token Selector */}
          <View style={styles.tokenSelector}>
            {TOKEN_OPTIONS.map(token => (
              <TouchableOpacity
                key={token}
                style={[
                  styles.tokenChip,
                  selectedToken === token && styles.tokenChipActive,
                ]}
                onPress={() => {
                  setSelectedToken(token);
                  setAmount('');
                }}>
                <Image
                  source={{uri: TOKEN_LOGOS[token]}}
                  style={styles.tokenChipLogo}
                />
                <Text
                  style={[
                    styles.tokenChipText,
                    selectedToken === token && styles.tokenChipTextActive,
                  ]}>
                  {token}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Recipient Address"
            placeholder="Enter Solana address"
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            autoCapitalize="none"
            autoCorrect={false}
            error={
              recipientAddress.trim() &&
              !isValidSolanaAddress(recipientAddress.trim())
                ? 'Invalid address'
                : undefined
            }
          />

          {/* Contact picker toggle */}
          <TouchableOpacity
            style={styles.contactToggle}
            onPress={() => setShowContacts(!showContacts)}>
            <Text style={styles.contactToggleText}>
              {showContacts ? 'Hide Contacts' : 'Select from Contacts'}
            </Text>
          </TouchableOpacity>

          {showContacts && (
            <View style={styles.contactList}>
              {contacts.length === 0 ? (
                <Text style={styles.noContacts}>No saved contacts</Text>
              ) : (
                contacts.map(c => (
                  <TouchableOpacity
                    key={c.wallet_address}
                    style={styles.contactRow}
                    onPress={() => handleSelectContact(c.wallet_address)}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {c.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{c.display_name}</Text>
                      <Text style={styles.contactAddr}>
                        {shortenAddress(c.wallet_address)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <View style={styles.amountRow}>
            <Input
              label={`Amount (${selectedToken})`}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              containerStyle={styles.amountInput}
            />
            <Button
              title="MAX"
              variant="ghost"
              onPress={handleMaxAmount}
              style={styles.maxButton}
            />
          </View>

          <Text style={styles.balanceHint}>
            Available: {formatTokenAmount(tokenBalance, selectedToken)}{' '}
            {selectedToken}
          </Text>

          <View style={styles.feeCard}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Amount</Text>
              <Text style={styles.feeValue}>
                {formatTokenAmount(parsedAmount, selectedToken)} {selectedToken}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Network Fee</Text>
              <Text style={styles.feeValue}>
                ~{lamportsToSol(fee)} SOL
              </Text>
            </View>
            {!isSol && (
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>ATA Creation (if needed)</Text>
                <Text style={styles.feeValue}>
                  ~{lamportsToSol(ATA_RENT_LAMPORTS)} SOL
                </Text>
              </View>
            )}
            <View style={[styles.feeRow, styles.feeTotal]}>
              <Text style={styles.feeTotalLabel}>Total</Text>
              <Text style={styles.feeTotalValue}>
                {formatTokenAmount(parsedAmount, selectedToken)} {selectedToken}
                {isSol ? ` + ${lamportsToSol(fee)} fee` : ''}
              </Text>
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={`Send ${selectedToken}`}
            onPress={handleSend}
            disabled={!canSend}
            style={styles.sendButton}
          />

          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay
        visible={isSending}
        message="Sending transaction..."
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  scroll: {flex: 1},
  content: {paddingVertical: 20},
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  tokenSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  tokenChip: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tokenChipLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  tokenChipActive: {
    backgroundColor: '#6C63FF',
  },
  tokenChipText: {
    color: '#A0A0B8',
    fontSize: 15,
    fontWeight: '600',
  },
  tokenChipTextActive: {
    color: '#FFFFFF',
  },
  contactToggle: {
    marginBottom: 16,
  },
  contactToggleText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  contactList: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    maxHeight: 200,
  },
  noContacts: {
    color: '#666680',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  contactAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  contactInfo: {flex: 1},
  contactName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  contactAddr: {
    color: '#666680',
    fontSize: 11,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  amountInput: {flex: 1},
  maxButton: {
    marginLeft: 8,
    marginBottom: 16,
    paddingVertical: 14,
  },
  balanceHint: {
    color: '#A0A0B8',
    fontSize: 12,
    marginBottom: 16,
    marginTop: -8,
  },
  feeCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    color: '#A0A0B8',
    fontSize: 14,
  },
  feeValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  feeTotal: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
    paddingTop: 8,
    marginTop: 4,
  },
  feeTotalLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  feeTotalValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: '#FF4D4D',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  sendButton: {
    marginBottom: 12,
  },
});
