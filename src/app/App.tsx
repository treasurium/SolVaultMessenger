/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/app/App.tsx
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  AppState,
  TouchableOpacity,
} from 'react-native';
import Providers from './providers';
import AppNavigation from './navigation';
import {useWalletStore} from '../stores/walletStore';
import {useAuthStore} from '../stores/authStore';
import {useChatStore} from '../stores/chatStore';
import {SolVaultAppIcon} from '../shared/components';
import {
  isBiometricEnabled,
  authenticateWithBiometric,
} from '../features/auth/services/biometricService';

function LockScreen({onUnlock}: {onUnlock: () => void}) {
  // Auto-trigger biometric prompt when lock screen appears
  useEffect(() => {
    (async () => {
      const authenticated = await authenticateWithBiometric('Unlock SolVault');
      if (authenticated) {
        onUnlock();
      }
    })();
  }, []);

  const handleUnlock = async () => {
    const authenticated = await authenticateWithBiometric('Unlock SolVault');
    if (authenticated) {
      onUnlock();
    }
  };

  return (
    <View style={styles.lockContainer}>
      <SolVaultAppIcon width={90} height={90} />
      <Text style={styles.lockTitle}>SolVault Locked</Text>
      <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
        <Text style={styles.unlockText}>Tap to Unlock</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppContent() {
  const {isInitialized, isLoading: walletLoading, publicKey, initialize: initWallet} =
    useWalletStore();
  const {initialize: initAuth, isLoading: authLoading} = useAuthStore();
  const {startListener, reconnectListener, stopListener} = useChatStore();

  const [isLocked, setIsLocked] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const appState = useRef(AppState.currentState);
  const listenerStarted = useRef(false);

  useEffect(() => {
    initAuth();
    initWallet();
  }, []);

  // Start global message listener when wallet is ready
  useEffect(() => {
    if (isInitialized && publicKey && !listenerStarted.current) {
      listenerStarted.current = true;
      startListener(publicKey);
    }

    return () => {
      if (listenerStarted.current) {
        listenerStarted.current = false;
        stopListener();
      }
    };
  }, [isInitialized, publicKey]);

  // Check biometric on initial app launch
  useEffect(() => {
    (async () => {
      try {
        const enabled = await isBiometricEnabled();
        if (enabled) {
          setIsLocked(true);
        }
      } catch {
        // Fail open if check errors
      } finally {
        setBiometricChecked(true);
      }
    })();
  }, []);

  // Biometric lock + reconnect listener when app returns from background
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async nextState => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          const enabled = await isBiometricEnabled();
          if (enabled) {
            setIsLocked(true);
          }

          // Reconnect WebSocket and catch up on missed messages
          if (isInitialized && publicKey) {
            reconnectListener();
          }
        }
        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [isInitialized, publicKey]);

  const isLoading = walletLoading || authLoading || !biometricChecked;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <SolVaultAppIcon width={90} height={90} />
        <ActivityIndicator
          size="large"
          color="#6C63FF"
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>Loading SolVault...</Text>
      </View>
    );
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return <AppNavigation hasWallet={isInitialized} />;
}

export default function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginTop: 24,
  },
  loadingText: {
    color: '#A0A0B8',
    fontSize: 16,
    marginTop: 16,
  },
  lockContainer: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
  },
  unlockButton: {
    marginTop: 32,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  unlockText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
