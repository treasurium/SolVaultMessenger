// src/features/wallet/screens/SendSolScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ScreenContainer,
  Button,
  Input,
  LoadingOverlay,
} from '../../../shared/components';
import {useWalletStore} from '../../../stores/walletStore';
import {isValidSolanaAddress, estimateFee} from '../services/transactionService';
import {formatSol, lamportsToSol} from '../../../shared/utils/format';
import type {WalletStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<WalletStackParamList, 'SendSol'>;

export default function SendSolScreen({navigation, route}: Props) {
  const {balance, sendSol} = useWalletStore();

  const [recipientAddress, setRecipientAddress] = useState(
    route.params?.recipientAddress ?? '',
  );
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = estimateFee();
  const parsedAmount = parseFloat(amount) || 0;
  const totalCost = parsedAmount + fee / 1_000_000_000;
  const canSend =
    recipientAddress.trim() &&
    parsedAmount > 0 &&
    totalCost <= balance &&
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

    if (totalCost > balance) {
      setError('Insufficient balance (including fee)');
      return;
    }

    Alert.alert(
      'Confirm Transaction',
      `Send ${formatSol(parsedAmount)} SOL?\n\nTo: ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-4)}\nFee: ${lamportsToSol(fee)} SOL`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Send',
          onPress: async () => {
            try {
              setIsSending(true);
              const result = await sendSol(
                recipientAddress.trim(),
                parsedAmount,
              );
              setIsSending(false);

              Alert.alert(
                'Transaction Sent!',
                `Signature: ${result.signature.slice(0, 16)}...`,
                [
                  {
                    text: 'Done',
                    onPress: () => navigation.goBack(),
                  },
                ],
              );
            } catch (err: any) {
              setIsSending(false);
              setError(err.message);
            }
          },
        },
      ],
    );
  };

  const handleMaxAmount = () => {
    const maxSol = Math.max(0, balance - fee / 1_000_000_000);
    setAmount(maxSol.toString());
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
          <Text style={styles.title}>Send SOL</Text>

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

          <View style={styles.amountRow}>
            <Input
              label="Amount (SOL)"
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

          <View style={styles.feeCard}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Amount</Text>
              <Text style={styles.feeValue}>{formatSol(parsedAmount)} SOL</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Network Fee</Text>
              <Text style={styles.feeValue}>{lamportsToSol(fee)} SOL</Text>
            </View>
            <View style={[styles.feeRow, styles.feeTotal]}>
              <Text style={styles.feeTotalLabel}>Total</Text>
              <Text style={styles.feeTotalValue}>
                {formatSol(totalCost)} SOL
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Balance After</Text>
              <Text
                style={[
                  styles.feeValue,
                  balance - totalCost < 0 && styles.feeValueNegative,
                ]}>
                {formatSol(Math.max(0, balance - totalCost))} SOL
              </Text>
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title="Send SOL"
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
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  amountInput: {
    flex: 1,
  },
  maxButton: {
    marginLeft: 8,
    marginBottom: 16,
    paddingVertical: 14,
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
  feeValueNegative: {
    color: '#FF4D4D',
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
