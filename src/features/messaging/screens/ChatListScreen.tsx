/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/screens/ChatListScreen.tsx
import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, SolVaultWordmark} from '../../../shared/components';
import {useChatStore} from '../../../stores/chatStore';
import {useContactsStore} from '../../../stores/contactsStore';
import {
  shortenAddress,
  formatRelativeTime,
} from '../../../shared/utils/format';
import type {ChatStackParamList} from '../../../shared/types';
import type {StoredConversation} from '../../../core/storage/database';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

export default function ChatListScreen({navigation}: Props) {
  const {
    conversations,
    isLoadingConversations,
    loadConversations,
  } = useChatStore();
  const {loadContacts, resolveAddress} = useContactsStore();

  useEffect(() => {
    loadConversations();
    loadContacts();
  }, []);

  const handleRefresh = useCallback(() => {
    loadConversations();
    loadContacts();
  }, []);

  const renderConversation = ({item}: {item: StoredConversation}) => {
    const contactName = resolveAddress(item.peer_address);
    const displayName = contactName ?? item.peer_name ?? shortenAddress(item.peer_address);

    // Show friendly text for payment messages
    let previewText = item.last_message_text ?? 'No messages yet';
    try {
      const parsed = JSON.parse(previewText);
      if (parsed.type === 'payment') {
        previewText = `Sent ${parsed.amount} ${parsed.token}`;
      }
    } catch {
      // Not JSON, use as-is
    }

    return (
      <TouchableOpacity
        style={styles.conversationRow}
        onPress={() =>
          navigation.navigate('Conversation', {
            peerAddress: item.peer_address,
            peerName: contactName ?? item.peer_name ?? undefined,
          })
        }
        activeOpacity={0.7}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.last_message_time && (
              <Text style={styles.conversationTime}>
                {formatRelativeTime(item.last_message_time)}
              </Text>
            )}
          </View>
          <View style={styles.conversationFooter}>
            <Text style={styles.conversationPreview} numberOfLines={1}>
              {previewText}
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
  };

  return (
    <ScreenContainer padded={false}>
      {/* Wordmark Logo */}
      <View style={styles.logoContainer}>
        <SolVaultWordmark width={200} height={30} />
      </View>

      {/* New Chat Button */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => navigation.navigate('NewMessage')}>
          <Text style={styles.newChatIcon}>+</Text>
          <Text style={styles.newChatLabel}>New Message</Text>
        </TouchableOpacity>
      </View>

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
              Start a new chat by tapping + New Message
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  newChatIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  newChatLabel: {
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
    marginBottom: 8,
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
