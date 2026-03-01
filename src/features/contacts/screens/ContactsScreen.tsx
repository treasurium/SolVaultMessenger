/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/contacts/screens/ContactsScreen.tsx
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import {ScreenContainer} from '../../../shared/components';
import {useContactsStore} from '../../../stores/contactsStore';
import {useWalletStore} from '../../../stores/walletStore';
import {shortenAddress} from '../../../shared/utils/format';
import {isValidSolanaAddress} from '../../wallet/services/transactionService';
import type {StoredContact} from '../../../core/storage/database';

export default function ContactsScreen() {
  const {contacts, isLoading, loadContacts, addContact, updateContact, removeContact} =
    useContactsStore();
  const {publicKey} = useWalletStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAdd = async () => {
    const address = newAddress.trim();
    const name = newName.trim();

    if (!address || !name) {
      Alert.alert('Missing Fields', 'Please enter both an address and a name.');
      return;
    }

    if (!isValidSolanaAddress(address)) {
      Alert.alert('Invalid Address', 'Please enter a valid Solana address.');
      return;
    }

    if (address === publicKey) {
      Alert.alert('Error', "You can't add yourself as a contact.");
      return;
    }

    await addContact(address, name);
    setNewAddress('');
    setNewName('');
    setShowAddForm(false);
  };

  const handleEdit = async (walletAddress: string) => {
    const name = editName.trim();
    if (!name) return;
    await updateContact(walletAddress, name);
    setEditingAddress(null);
    setEditName('');
  };

  const handleDelete = (contact: StoredContact) => {
    Alert.alert(
      'Delete Contact',
      `Remove ${contact.display_name} from contacts?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeContact(contact.wallet_address),
        },
      ],
    );
  };

  const startEdit = (contact: StoredContact) => {
    setEditingAddress(contact.wallet_address);
    setEditName(contact.display_name);
  };

  const renderContact = ({item}: {item: StoredContact}) => {
    const isEditing = editingAddress === item.wallet_address;

    return (
      <View style={styles.contactRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                placeholder="Display name"
                placeholderTextColor="#666680"
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => handleEdit(item.wallet_address)}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => startEdit(item)} activeOpacity={0.7}>
              <Text style={styles.contactName}>{item.display_name}</Text>
              <Text style={styles.contactAddress}>
                {shortenAddress(item.wallet_address, 8)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {!isEditing && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={styles.deleteBtnText}>X</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}>
          <Text style={styles.addButtonText}>{showAddForm ? 'X' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.formInput}
            placeholder="Solana wallet address"
            placeholderTextColor="#666680"
            value={newAddress}
            onChangeText={setNewAddress}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.formInput}
            placeholder="Display name"
            placeholderTextColor="#666680"
            value={newName}
            onChangeText={setNewName}
          />
          <TouchableOpacity
            style={[
              styles.addContactBtn,
              (!newAddress.trim() || !newName.trim()) && styles.addContactBtnDisabled,
            ]}
            onPress={handleAdd}
            disabled={!newAddress.trim() || !newName.trim()}>
            <Text style={styles.addContactBtnText}>Add Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={contacts}
        keyExtractor={item => item.wallet_address}
        renderItem={renderContact}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No contacts yet</Text>
            <Text style={styles.emptySubtext}>
              Add contacts to see names instead of addresses
            </Text>
          </View>
        }
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14F195',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#0D0D1A',
    fontSize: 22,
    fontWeight: '600',
  },
  addForm: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  formInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 8,
  },
  addContactBtn: {
    backgroundColor: '#14F195',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addContactBtnDisabled: {
    opacity: 0.4,
  },
  addContactBtnText: {
    color: '#0D0D1A',
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
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
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactAddress: {
    color: '#666680',
    fontSize: 12,
    marginTop: 2,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 8,
  },
  saveBtn: {
    backgroundColor: '#14F195',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveBtnText: {
    color: '#0D0D1A',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,60,60,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteBtnText: {
    color: '#FF3C3C',
    fontSize: 13,
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
