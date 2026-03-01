/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/shared/components/ScreenContainer.tsx
import React from 'react';
import {View, StyleSheet, StatusBar, type ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export default function ScreenContainer({
  children,
  style,
  padded = true,
  edges = ['top'],
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
      <View style={[styles.container, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  padded: {
    paddingHorizontal: 20,
  },
});
