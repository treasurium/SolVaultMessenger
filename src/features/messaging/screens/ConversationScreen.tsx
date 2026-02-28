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
import {
  shortenAddress,
  formatTime,
  getExplorerUrl,
} from '../../../shared/utils/format';
import {useAuthStore} from '../../../stores/authStore';
import type {ChatStackParamList} from '../../../shared/types';
import type {StoredMessage} from '../../../core/storage/database';

type Props = NativeStackScreenProps<ChatStackParamList, 'Conversation'>;

export default function ConversationScreen({navigation, route}: Props) {
  const {peerAddress, peerName} = route.params;
  const {
    currentMessages,
    isLoadingMessages,
    isSending,
    loadMessages,
    sendMessage,
    markRead,
    checkForNewMessages,
  } = useChatStore();
  const {publicKey} = useWalletStore();
  const {isDevnet} = useAuthStore();

  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages(peerAddress);
    markRead(peerAddress);
  }, [peerAddress]);

  // Poll for new messages in this conversation
  useEffect(() => {
    const interval = setInterval(() => {
      checkForNewMessages();
      loadMessages(peerAddress);
    }, 8_000);
    return () => clearInterval(interval);
  }, [peerAddress]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: peerName ?? shortenAddress(peerAddress),
      headerStyle: {backgroundColor: '#0D0D1A'},
      headerTintColor: '#FFFFFF',
    });
  }, [navigation, peerName, peerAddress]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) {
      return;
    }

    setMessageText('');

    try {
      await sendMessage(peerAddress, text);
      loadMessages(peerAddress);
    } catch (err: any) {
      Alert.alert('Send Failed', err.message);
      setMessageText(text); // Restore text on failure
    }
  };

  const handleTxPress = (signature: string) => {
    const url = getExplorerUrl(signature, isDevnet);
    Linking.openURL(url);
  };

  const renderMessage = useCallback(
    ({item}: {item: StoredMessage}) => {
      const isMine = item.sender_address === publicKey;

      return (
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myMessage : styles.theirMessage,
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
              <Text style={styles.pendingStatus}>Sending...</Text>
            )}
            {item.status === 'confirmed' && isMine && (
              <Text style={styles.confirmedStatus}>✓</Text>
            )}
          </View>
        </View>
      );
    },
    [publicKey, isDevnet],
  );

  // Messages are stored newest-first, but we display oldest-first
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
                  {peerName ?? shortenAddress(peerAddress)}
                </Text>
                <Text style={styles.emptySubtext}>
                  Messages are encrypted on-chain using NaCl box
                </Text>
              </View>
            }
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({animated: false})
            }
          />
        )}

        <View style={styles.inputBar}>
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
  pendingStatus: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  confirmedStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
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
    marginRight: 8,
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
