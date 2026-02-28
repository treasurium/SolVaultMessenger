// src/features/auth/screens/SettingsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import {ScreenContainer, Button} from '../../../shared/components';
import {useAuthStore} from '../../../stores/authStore';
import {useWalletStore} from '../../../stores/walletStore';
import {shortenAddress} from '../../../shared/utils/format';
import {retrieveMnemonic} from '../../wallet/services/mnemonicService';

export default function SettingsScreen() {
  const {isDevnet, toggleNetwork, logout, displayName} = useAuthStore();
  const {publicKey} = useWalletStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Make sure you have backed up your recovery phrase.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout,
        },
      ],
    );
  };

  const handleShowPhrase = () => {
    Alert.alert(
      'Show Recovery Phrase',
      'This will display your secret recovery phrase. Make sure no one is watching your screen.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Show Phrase',
          onPress: async () => {
            try {
              const mnemonic = await retrieveMnemonic();
              if (!mnemonic) {
                Alert.alert('Error', 'No recovery phrase found.');
                return;
              }
              const words = mnemonic.split(' ');
              const formatted = words
                .map((w, i) => `${i + 1}. ${w}`)
                .join('\n');
              Alert.alert('Recovery Phrase', formatted);
            } catch {
              Alert.alert('Error', 'Failed to retrieve recovery phrase.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{displayName ?? 'Not set'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Wallet Address</Text>
            <Text style={styles.rowValue}>
              {publicKey ? shortenAddress(publicKey, 8) : 'Not set'}
            </Text>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity style={styles.row} onPress={handleShowPhrase}>
            <Text style={styles.rowLabel}>Show Recovery Phrase</Text>
            <Text style={styles.rowChevron}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Network Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network</Text>

          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Use Devnet</Text>
              <Text style={styles.rowDescription}>
                {isDevnet
                  ? 'Connected to Solana Devnet (test tokens)'
                  : 'Connected to Solana Mainnet (real SOL)'}
              </Text>
            </View>
            <Switch
              value={isDevnet}
              onValueChange={toggleNetwork}
              trackColor={{false: '#2A2A3E', true: '#6C63FF'}}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0 (MVP)</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Encryption</Text>
            <Text style={styles.rowValue}>NaCl box (X25519)</Text>
          </View>
        </View>

        <Button
          title="Sign Out"
          variant="danger"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666680',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  rowValue: {
    color: '#A0A0B8',
    fontSize: 14,
  },
  rowDescription: {
    color: '#666680',
    fontSize: 12,
    marginTop: 2,
  },
  rowChevron: {
    color: '#666680',
    fontSize: 18,
  },
  logoutButton: {
    marginTop: 16,
    marginBottom: 40,
  },
});
