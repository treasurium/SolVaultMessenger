/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/auth/screens/SettingsScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {Connection} from '@solana/web3.js';
import Clipboard from '@react-native-clipboard/clipboard';
import {ScreenContainer, Button} from '../../../shared/components';
import {useAuthStore} from '../../../stores/authStore';
import {useWalletStore} from '../../../stores/walletStore';
import {shortenAddress} from '../../../shared/utils/format';
import {retrieveMnemonic} from '../../wallet/services/mnemonicService';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometricLock,
  disableBiometricLock,
  getBiometricType,
} from '../services/biometricService';
import {
  saveCustomRpc,
  loadCustomRpc,
  clearCustomRpc,
} from '../../../config/customRpc';
import {resetConnection} from '../../../core/solana/connection';

export default function SettingsScreen() {
  const {isDevnet, toggleNetwork, logout, displayName, setDisplayName} =
    useAuthStore();
  const {publicKey} = useWalletStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName ?? '');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);

  // Custom RPC state
  const [customRpcUrl, setCustomRpcUrl] = useState('');
  const [customWssUrl, setCustomWssUrl] = useState('');
  const [hasCustomRpc, setHasCustomRpc] = useState(false);
  const [rpcTesting, setRpcTesting] = useState(false);
  const [showRpcInput, setShowRpcInput] = useState(false);

  // Load custom RPC on mount
  React.useEffect(() => {
    (async () => {
      const custom = await loadCustomRpc();
      if (custom) {
        setCustomRpcUrl(custom.endpoint);
        setCustomWssUrl(custom.wsEndpoint ?? '');
        setHasCustomRpc(true);
      }
    })();
  }, []);

  const handleTestAndSaveRpc = async () => {
    const url = customRpcUrl.trim();
    if (!url) {
      Alert.alert('Error', 'Please enter an RPC URL');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Error', 'RPC URL must start with http:// or https://');
      return;
    }

    setRpcTesting(true);
    try {
      const conn = new Connection(url, 'confirmed');
      const slot = await conn.getSlot();
      // Connection works
      await saveCustomRpc(url, customWssUrl.trim() || undefined);
      resetConnection(); // Force reconnect with new RPC
      setHasCustomRpc(true);
      setShowRpcInput(false);
      Alert.alert('Connected', `Custom RPC is working (slot: ${slot})`);
    } catch (err: any) {
      Alert.alert('Connection Failed', err.message || 'Could not reach this RPC endpoint');
    } finally {
      setRpcTesting(false);
    }
  };

  const handleRemoveCustomRpc = async () => {
    await clearCustomRpc();
    resetConnection();
    setCustomRpcUrl('');
    setCustomWssUrl('');
    setHasCustomRpc(false);
    setShowRpcInput(false);
    Alert.alert('Removed', 'Using default RPC endpoints');
  };

  // Load biometric state on mount
  React.useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);
        const type = await getBiometricType();
        setBiometricType(type);
      }
    })();
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const success = await enableBiometricLock();
      setBiometricEnabled(success);
    } else {
      await disableBiometricLock();
      setBiometricEnabled(false);
    }
  };

  const handleSaveName = async () => {
    const name = nameInput.trim();
    if (name) {
      await setDisplayName(name);
    }
    setIsEditingName(false);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      Clipboard.setString(publicKey);
      Alert.alert('Copied', 'Wallet address copied to clipboard.');
    }
  };

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

          {/* Display Name */}
          <View style={styles.row}>
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Enter display name"
                  placeholderTextColor="#666680"
                  autoFocus
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity
                  style={styles.saveNameBtn}
                  onPress={handleSaveName}>
                  <Text style={styles.saveNameText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.rowTouchable}
                onPress={() => {
                  setNameInput(displayName ?? '');
                  setIsEditingName(true);
                }}
                activeOpacity={0.7}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Display Name</Text>
                  <Text style={styles.rowDescription}>
                    Only visible to you (not shared on-chain)
                  </Text>
                </View>
                <Text style={styles.rowValue}>
                  {displayName ?? 'Tap to set'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Wallet Address */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleCopyAddress}
            activeOpacity={0.7}>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Wallet Address</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {publicKey ?? 'Not set'}
              </Text>
            </View>
            <Text style={styles.copyBtn}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity style={styles.row} onPress={handleShowPhrase}>
            <Text style={styles.rowLabel}>Show Recovery Phrase</Text>
            <Text style={styles.rowChevron}>&#8594;</Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Biometric Lock</Text>
                <Text style={styles.rowDescription}>
                  Require {biometricType ?? 'biometric'} to open app
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{false: '#2A2A3E', true: '#6C63FF'}}
                thumbColor="#FFFFFF"
              />
            </View>
          )}
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

        {/* Custom RPC Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RPC Endpoint</Text>
          <Text style={styles.sectionNote}>
            Use your own Solana RPC for maximum censorship resistance
          </Text>

          {hasCustomRpc && !showRpcInput ? (
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Custom RPC</Text>
                <Text style={styles.rowDescription} numberOfLines={1}>
                  {customRpcUrl}
                </Text>
              </View>
              <View style={styles.rpcActions}>
                <TouchableOpacity
                  onPress={() => setShowRpcInput(true)}
                  style={styles.rpcActionBtn}>
                  <Text style={styles.rpcEditText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRemoveCustomRpc}
                  style={styles.rpcActionBtn}>
                  <Text style={styles.rpcRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !showRpcInput ? (
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowRpcInput(true)}>
              <Text style={styles.rowLabel}>Add Custom RPC</Text>
              <Text style={styles.rowChevron}>+</Text>
            </TouchableOpacity>
          ) : null}

          {showRpcInput && (
            <View style={styles.rpcInputSection}>
              <TextInput
                style={styles.rpcInput}
                placeholder="https://your-rpc-endpoint.com"
                placeholderTextColor="#666680"
                value={customRpcUrl}
                onChangeText={setCustomRpcUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TextInput
                style={[styles.rpcInput, styles.rpcInputSmall]}
                placeholder="wss://your-ws-endpoint.com (optional)"
                placeholderTextColor="#666680"
                value={customWssUrl}
                onChangeText={setCustomWssUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <View style={styles.rpcButtonRow}>
                <TouchableOpacity
                  style={[styles.rpcSaveBtn, rpcTesting && styles.rpcBtnDisabled]}
                  onPress={handleTestAndSaveRpc}
                  disabled={rpcTesting}>
                  {rpcTesting ? (
                    <ActivityIndicator size="small" color="#0D0D1A" />
                  ) : (
                    <Text style={styles.rpcSaveText}>Test & Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rpcCancelBtn}
                  onPress={() => setShowRpcInput(false)}>
                  <Text style={styles.rpcCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!hasCustomRpc && !showRpcInput && (
            <View style={[styles.row, styles.rpcInfoRow]}>
              <Text style={styles.rpcInfoText}>
                Using built-in multi-RPC fallback (Solana Public, Ankr, Public RPC)
              </Text>
            </View>
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.3.0</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Encryption</Text>
            <Text style={styles.rowValue}>NaCl box (X25519)</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Architecture</Text>
            <Text style={styles.rowValue}>Fully P2P (no backend)</Text>
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
  rowTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addressText: {
    color: '#A0A0B8',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  copyBtn: {
    color: '#14F195',
    fontSize: 13,
    fontWeight: '600',
  },
  editNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 8,
  },
  saveNameBtn: {
    backgroundColor: '#14F195',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveNameText: {
    color: '#0D0D1A',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 16,
    marginBottom: 40,
  },
  sectionNote: {
    color: '#666680',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  rpcActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rpcActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  rpcEditText: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },
  rpcRemoveText: {
    color: '#FF4D4D',
    fontSize: 13,
    fontWeight: '600',
  },
  rpcInputSection: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 2,
  },
  rpcInput: {
    backgroundColor: '#0D0D1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  rpcInputSmall: {
    fontSize: 13,
  },
  rpcButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rpcSaveBtn: {
    flex: 1,
    backgroundColor: '#14F195',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rpcBtnDisabled: {
    opacity: 0.6,
  },
  rpcSaveText: {
    color: '#0D0D1A',
    fontSize: 14,
    fontWeight: '700',
  },
  rpcCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpcCancelText: {
    color: '#A0A0B8',
    fontSize: 14,
    fontWeight: '500',
  },
  rpcInfoRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  rpcInfoText: {
    color: '#666680',
    fontSize: 12,
    lineHeight: 18,
  },
});
