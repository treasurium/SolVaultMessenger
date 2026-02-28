// src/app/App.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import Providers from './providers';
import AppNavigation from './navigation';
import {useWalletStore} from '../stores/walletStore';
import {useAuthStore} from '../stores/authStore';

function AppContent() {
  const {isInitialized, isLoading: walletLoading, initialize: initWallet} =
    useWalletStore();
  const {initialize: initAuth, isLoading: authLoading} = useAuthStore();

  useEffect(() => {
    initAuth();
    initWallet();
  }, []);

  const isLoading = walletLoading || authLoading;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading SolVault...</Text>
      </View>
    );
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
  loadingText: {
    color: '#A0A0B8',
    fontSize: 16,
    marginTop: 16,
  },
});
