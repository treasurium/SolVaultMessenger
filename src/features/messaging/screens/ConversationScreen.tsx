/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/screens/ConversationScreen.tsx
import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer} from '../../../shared/components';
import {useChatStore} from '../../../stores/chatStore';
import {useWalletStore} from '../../../stores/walletStore';
import {useContactsStore} from '../../../stores/contactsStore';
import {
  shortenAddress,
  formatTime,
  getExplorerUrl,
} from '../../../shared/utils/format';
import {useAuthStore} from '../../../stores/authStore';
import type {ChatStackParamList} from '../../../shared/types';
import type {StoredMessage} from '../../../core/storage/database';
import type {TokenSymbol} from '../../../core/solana/constants';
import PaymentModal from '../components/PaymentModal';
import PaymentBubble from '../components/PaymentBubble';

type Props = NativeStackScreenProps<ChatStackParamList, 'Conversation'>;

// Real-time delivery handled by global WebSocket listener in App.tsx (via chatStore.startListener)
// When new messages arrive for this conversation, the global listener auto-refreshes the UI

/** Check if a plaintext message is a payment JSON */
function parsePayment(plaintext: string) {
  try {
    const parsed = JSON.parse(plaintext);
    if (parsed.type === 'payment' && parsed.token && parsed.amount) {
      return parsed;
    }
  } catch {
    // Not JSON
  }
  return null;
}

export default function ConversationScreen({navigation, route}: Props) {
  const {peerAddress, peerName} = route.params;
  const {
    currentMessages,
    isLoadingMessages,
    isSending,
    loadMessages,
    sendMessage,
    markRead,
    fetchNewMessages,
    setCurrentConversation,
  } = useChatStore();
  const {publicKey, sendToken, refreshBalance} = useWalletStore();
  const {resolveAddress} = useContactsStore();
  const {isDevnet} = useAuthStore();

  const contactName = resolveAddress(peerAddress);
  const headerTitle = contactName ?? peerName ?? shortenAddress(peerAddress);

  const [messageText, setMessageText] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Tell the store which conversation is active (for global listener auto-refresh)
    setCurrentConversation(peerAddress);

    // Load messages from local DB first (instant)
    loadMessages(peerAddress);

    // Send read receipts for messages already in local DB
    markRead(peerAddress);

    // Fetch any new messages from on-chain, then send receipts for those too
    fetchNewMessages(peerAddress).then(() => {
      markRead(peerAddress);
    });

    return () => {
      setCurrentConversation(null);
    };
  }, [peerAddress, publicKey]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: headerTitle,
      headerStyle: {backgroundColor: '#0D0D1A'},
      headerTintColor: '#FFFFFF',
    });
  }, [navigation, peerName, peerAddress, headerTitle]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;

    setMessageText('');

    try {
      await sendMessage(peerAddress, text);
      loadMessages(peerAddress);
    } catch (err: any) {
      Alert.alert('Send Failed', err.message);
      setMessageText(text);
    }
  };

  const handlePaymentSend = async (token: TokenSymbol, amount: number) => {
    // 1. Execute the transfer
    const result = await sendToken(peerAddress, amount, token);

    // 2. Create payment message JSON
    const paymentPayload = JSON.stringify({
      type: 'payment',
      token,
      amount: amount.toString(),
      txSignature: result.signature,
    });

    // 3. Send as encrypted message
    await sendMessage(peerAddress, paymentPayload);
    loadMessages(peerAddress);
    refreshBalance();

    // 4. Close modal
    setPaymentModalVisible(false);
  };

  const handleTxPress = (signature: string) => {
    const url = getExplorerUrl(signature, isDevnet);
    Linking.openURL(url);
  };

  const renderReadStatus = (message: StoredMessage) => {
    if (message.status === 'pending') return null;
    const readStatus = message.read_status ?? 'sent';

    switch (readStatus) {
      case 'sent':
        return <Text style={styles.checkGrey}>✓</Text>;
      case 'delivered':
        return <Text style={styles.checkGrey}>✓✓</Text>;
      case 'read':
        return <Text style={styles.checkBlue}>✓✓</Text>;
      default:
        return null;
    }
  };

  const renderMessage = useCallback(
    ({item}: {item: StoredMessage}) => {
      const isMine =
        item.sender_address === publicKey ||
        item.sender_address === '_self_';

      // Check if payment message
      const paymentData = parsePayment(item.plaintext);
      if (paymentData) {
        return (
          <PaymentBubble
            payment={paymentData}
            isMine={isMine}
            timestamp={item.timestamp}
            isDevnet={isDevnet}
          />
        );
      }

      return (
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myMessage : styles.theirMessage,
            item.status === 'pending' && styles.pendingBubble,
          ]}>
          <Text
            style={[
              styles.messageText,
              isMine ? styles.myMessageText : styles.theirMessageText,
            ]}>
            {item.plaintext}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatTime(item.timestamp)}
            </Text>
            {item.tx_signature && (
              <TouchableOpacity
                onPress={() => handleTxPress(item.tx_signature!)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.txLink}>
                  tx: {item.tx_signature.slice(0, 8)}...
                </Text>
              </TouchableOpacity>
            )}
            {item.status === 'pending' && (
              <View style={styles.pendingRow}>
                <ActivityIndicator
                  size="small"
                  color="rgba(255,255,255,0.5)"
                />
                <Text style={styles.pendingStatus}>Sending...</Text>
              </View>
            )}
            {item.status === 'confirmed' && isMine && renderReadStatus(item)}
          </View>
        </View>
      );
    },
    [publicKey, isDevnet],
  );

  const sortedMessages = [...currentMessages].reverse();

  return (
    <ScreenContainer padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        {isLoadingMessages && currentMessages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={sortedMessages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Start a conversation with{'\n'}
                  {headerTitle}
                </Text>
                <Text style={styles.emptySubtext}>
                  Messages are E2E encrypted on-chain via NaCl box
                </Text>
              </View>
            }
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({animated: false})
            }
          />
        )}

        <View style={styles.inputBar}>
          {/* Payment button */}
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => setPaymentModalVisible(true)}>
            <Text style={styles.payButtonText}>+</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#666680"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={400}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSend={handlePaymentSend}
        peerName={headerTitle}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A2E',
    borderBottomLeftRadius: 4,
  },
  pendingBubble: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  messageTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  txLink: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingStatus: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  checkGrey: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  checkBlue: {
    color: '#4FC3F7',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#A0A0B8',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#666680',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
  },
  payButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14F195',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  payButtonText: {
    color: '#0D0D1A',
    fontSize: 22,
    fontWeight: '700',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 12,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
