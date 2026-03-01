/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/messaging/screens/NewMessageScreen.tsx
import React, {useEffect} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer} from '../../../shared/components';
import ContactPicker from '../../../shared/components/ContactPicker';
import {useWalletStore} from '../../../stores/walletStore';
import {useContactsStore} from '../../../stores/contactsStore';
import type {ChatStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'NewMessage'>;

export default function NewMessageScreen({navigation}: Props) {
  const {publicKey} = useWalletStore();
  const {loadContacts} = useContactsStore();

  useEffect(() => {
    loadContacts();
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'New Message',
      headerStyle: {backgroundColor: '#0D0D1A'},
      headerTintColor: '#FFFFFF',
    });
  }, [navigation]);

  const handleSelectContact = (address: string, name: string) => {
    if (address === publicKey) return;
    navigation.replace('Conversation', {peerAddress: address, peerName: name});
  };

  const handleSubmitAddress = (address: string) => {
    if (address === publicKey) return;
    navigation.replace('Conversation', {peerAddress: address});
  };

  return (
    <ScreenContainer padded={false}>
      <ContactPicker
        onSelectContact={handleSelectContact}
        onSubmitAddress={handleSubmitAddress}
        placeholder="Enter Solana address or search contacts..."
      />
    </ScreenContainer>
  );
}
