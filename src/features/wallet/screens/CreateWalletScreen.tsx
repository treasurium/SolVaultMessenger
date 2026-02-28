// src/features/wallet/screens/CreateWalletScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Button, Input, LoadingOverlay} from '../../../shared/components';
import {useWalletStore} from '../../../stores/walletStore';
import type {OnboardingStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'CreateWallet'>;

export default function CreateWalletScreen({navigation}: Props) {
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWallet = useWalletStore(s => s.createWallet);

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      const mnemonic = await createWallet();
      setIsCreating(false);
      navigation.navigate('BackupPhrase', {mnemonic});
    } catch (err: any) {
      setIsCreating(false);
      setError(err.message);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View>
          <Text style={styles.title}>Create Your Wallet</Text>
          <Text style={styles.description}>
            We'll generate a new Solana wallet for you. Your private keys never
            leave your device.
          </Text>

          <Input
            label="Display Name"
            placeholder="How should others see you?"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.actions}>
          <Button
            title="Generate Wallet"
            onPress={handleCreate}
            loading={isCreating}
            disabled={!displayName.trim()}
          />
          <Button
            title="Go Back"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </View>

      <LoadingOverlay
        visible={isCreating}
        message="Generating your wallet..."
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#A0A0B8',
    marginBottom: 32,
    lineHeight: 22,
  },
  error: {
    color: '#FF4D4D',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    marginBottom: 20,
  },
  backButton: {
    marginTop: 12,
  },
});
