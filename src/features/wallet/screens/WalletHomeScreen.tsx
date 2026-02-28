// src/features/wallet/screens/WalletHomeScreen.tsx
import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Button} from '../../../shared/components';
import {useWalletStore} from '../../../stores/walletStore';
import {useAuthStore} from '../../../stores/authStore';
import {
  formatSol,
  shortenAddress,
  formatRelativeTime,
} from '../../../shared/utils/format';
import type {WalletStackParamList} from '../../../shared/types';
import type {TransactionRecord} from '../services/transactionService';

type Props = NativeStackScreenProps<WalletStackParamList, 'WalletHome'>;

export default function WalletHomeScreen({navigation}: Props) {
  const {
    publicKey,
    balance,
    balanceLoading,
    transactions,
    refreshBalance,
    refreshTransactions,
  } = useWalletStore();
  const {isDevnet} = useAuthStore();

  useEffect(() => {
    refreshBalance();
    refreshTransactions();
  }, []);

  // Poll balance
  useEffect(() => {
    const interval = setInterval(refreshBalance, 15_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshBalance();
    refreshTransactions();
  }, []);

  const renderTransaction = ({item}: {item: TransactionRecord}) => (
    <View style={styles.txRow}>
      <View style={styles.txIcon}>
        <Text style={styles.txIconText}>
          {item.type === 'send' ? '↑' : item.type === 'receive' ? '↓' : '💬'}
        </Text>
      </View>
      <View style={styles.txContent}>
        <Text style={styles.txType}>
          {item.type === 'send'
            ? 'Sent'
            : item.type === 'receive'
            ? 'Received'
            : 'Message'}
        </Text>
        <Text style={styles.txAddress}>
          {shortenAddress(item.counterparty)}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text
          style={[
            styles.txAmount,
            item.type === 'receive' && styles.txAmountPositive,
          ]}>
          {item.type === 'send' ? '-' : '+'}
          {formatSol(item.amount)} SOL
        </Text>
        <Text style={styles.txTime}>
          {formatRelativeTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        {isDevnet && (
          <View style={styles.devnetBadge}>
            <Text style={styles.devnetText}>DEVNET</Text>
          </View>
        )}
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balance}>{formatSol(balance)} SOL</Text>
        {publicKey && (
          <Text style={styles.address}>{shortenAddress(publicKey, 6)}</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title="Deposit"
          variant="secondary"
          onPress={() => navigation.navigate('Deposit')}
          style={styles.actionButton}
        />
        <View style={styles.actionSpacer} />
        <Button
          title="Send"
          onPress={() => navigation.navigate('SendSol', {})}
          style={styles.actionButton}
        />
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>

      <FlatList
        data={transactions}
        keyExtractor={item => item.signature}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl
            refreshing={balanceLoading}
            onRefresh={handleRefresh}
            tintColor="#6C63FF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Deposit SOL to get started
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  devnetBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  devnetText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  balanceLabel: {
    color: '#A0A0B8',
    fontSize: 14,
    marginBottom: 4,
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 4,
  },
  address: {
    color: '#666680',
    fontSize: 13,
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  actionSpacer: {
    width: 12,
  },
  sectionTitle: {
    color: '#A0A0B8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txIconText: {
    fontSize: 18,
  },
  txContent: {
    flex: 1,
  },
  txType: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  txAddress: {
    color: '#666680',
    fontSize: 12,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  txAmountPositive: {
    color: '#00CC66',
  },
  txTime: {
    color: '#666680',
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#A0A0B8',
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#666680',
    fontSize: 13,
    marginTop: 4,
  },
});
