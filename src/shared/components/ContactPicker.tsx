/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/shared/components/ContactPicker.tsx
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useContactsStore} from '../../stores/contactsStore';
import {isValidSolanaAddress} from '../../features/wallet/services/transactionService';
import {shortenAddress} from '../utils/format';

interface ContactPickerProps {
  onSelectContact: (address: string, name: string) => void;
  onSubmitAddress: (address: string) => void;
  placeholder?: string;
}

export default function ContactPicker({
  onSelectContact,
  onSubmitAddress,
  placeholder = 'Enter Solana address or search contacts...',
}: ContactPickerProps) {
  const {contacts, resolveAddress} = useContactsStore();
  const [searchText, setSearchText] = useState('');

  const filteredContacts = useMemo(() => {
    if (!searchText.trim()) return contacts;
    const query = searchText.toLowerCase();
    return contacts.filter(
      c =>
        c.display_name.toLowerCase().includes(query) ||
        c.wallet_address.toLowerCase().includes(query),
    );
  }, [contacts, searchText]);

  const isValidAddress = searchText.trim() && isValidSolanaAddress(searchText.trim());
  const resolvedName = isValidAddress ? resolveAddress(searchText.trim()) : null;

  const handleSubmitAddress = () => {
    const address = searchText.trim();
    if (!isValidSolanaAddress(address)) return;
    const name = resolveAddress(address);
    if (name) {
      onSelectContact(address, name);
    } else {
      onSubmitAddress(address);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#666680"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleSubmitAddress}
        />
      </View>

      {isValidAddress && (
        <TouchableOpacity
          style={styles.addressResult}
          onPress={handleSubmitAddress}>
          <View style={styles.goAvatar}>
            <Text style={styles.goAvatarText}>
              {resolvedName ? resolvedName.charAt(0).toUpperCase() : '→'}
            </Text>
          </View>
          <View style={styles.goInfo}>
            <Text style={styles.goName}>
              {resolvedName ?? 'New Address'}
            </Text>
            <Text style={styles.goAddr}>
              {shortenAddress(searchText.trim())}
            </Text>
          </View>
          <Text style={styles.goButton}>Start Chat</Text>
        </TouchableOpacity>
      )}

      {filteredContacts.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Contacts</Text>
          <FlatList
            data={filteredContacts}
            keyExtractor={item => item.wallet_address}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() =>
                  onSelectContact(item.wallet_address, item.display_name)
                }>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.display_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.display_name}</Text>
                  <Text style={styles.contactAddr}>
                    {shortenAddress(item.wallet_address)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </>
      )}

      {filteredContacts.length === 0 && !isValidAddress && searchText.trim() && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No matching contacts</Text>
          <Text style={styles.emptySubtext}>
            Enter a valid Solana address to start a new chat
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 15,
  },
  addressResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  goAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  goInfo: {
    flex: 1,
  },
  goName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  goAddr: {
    color: '#666680',
    fontSize: 12,
    marginTop: 2,
  },
  goButton: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#A0A0B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#9945FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  contactAddr: {
    color: '#666680',
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#A0A0B8',
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#666680',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
