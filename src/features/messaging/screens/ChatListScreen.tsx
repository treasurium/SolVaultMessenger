// src/features/messaging/screens/ChatListScreen.tsx
import React, {useEffect, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Input} from '../../../shared/components';
import {useChatStore} from '../../../stores/chatStore';
import {useWalletStore} from '../../../stores/walletStore';
import {
  shortenAddress,
  formatRelativeTime,
} from '../../../shared/utils/format';
import {isValidSolanaAddress} from '../../wallet/services/transactionService';
import type {ChatStackParamList} from '../../../shared/types';
import type {StoredConversation} from '../../../core/storage/database';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

export default function ChatListScreen({navigation}: Props) {
  const {
    conversations,
    isLoadingConversations,
    loadConversations,
    checkForNewMessages,
  } = useChatStore();
  const {publicKey} = useWalletStore();

  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatAddress, setNewChatAddress] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(checkForNewMessages, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    loadConversations();
    checkForNewMessages();
  }, []);

  const handleNewChat = () => {
    const address = newChatAddress.trim();

    if (!address) {
      return;
    }

    if (!isValidSolanaAddress(address)) {
      Alert.alert('Invalid Address', 'Please enter a valid Solana address.');
      return;
    }

    if (address === publicKey) {
      Alert.alert('Error', "You can't message yourself.");
      return;
    }

    setShowNewChat(false);
    setNewChatAddress('');
    navigation.navigate('Conversation', {peerAddress: address});
  };

  const renderConversation = ({item}: {item: StoredConversation}) => (
    <TouchableOpacity
      style={styles.conversationRow}
      onPress={() =>
        navigation.navigate('Conversation', {
          peerAddress: item.peer_address,
          peerName: item.peer_name ?? undefined,
        })
      }
      activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.peer_name ?? item.peer_address).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.peer_name ?? shortenAddress(item.peer_address)}
          </Text>
          {item.last_message_time && (
            <Text style={styles.conversationTime}>
              {formatRelativeTime(item.last_message_time)}
            </Text>
          )}
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            {item.last_message_text ?? 'No messages yet'}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => setShowNewChat(!showNewChat)}>
          <Text style={styles.newChatIcon}>{showNewChat ? '✕' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {showNewChat && (
        <View style={styles.newChatContainer}>
          <Input
            placeholder="Enter Solana address"
            value={newChatAddress}
            onChangeText={setNewChatAddress}
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={styles.newChatInput}
          />
          <TouchableOpacity
            style={[
              styles.startChatButton,
              !newChatAddress.trim() && styles.startChatButtonDisabled,
            ]}
            onPress={handleNewChat}
            disabled={!newChatAddress.trim()}>
            <Text style={styles.startChatText}>Start Chat</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        renderItem={renderConversation}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingConversations}
            onRefresh={handleRefresh}
            tintColor="#6C63FF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start a new chat by tapping the + button
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '300',
  },
  newChatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  newChatInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  startChatButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startChatButtonDisabled: {
    opacity: 0.5,
  },
  startChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    color: '#666680',
    fontSize: 12,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationPreview: {
    color: '#A0A0B8',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#A0A0B8',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#666680',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
