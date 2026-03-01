/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/shared/components/WordChip.tsx
// Used for mnemonic phrase display and confirmation
import React from 'react';
import {TouchableOpacity, Text, StyleSheet, type ViewStyle} from 'react-native';

interface WordChipProps {
  word: string;
  index?: number;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function WordChip({
  word,
  index,
  onPress,
  selected = false,
  disabled = false,
  style,
}: WordChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}>
      {index !== undefined && (
        <Text style={styles.index}>{index + 1}.</Text>
      )}
      <Text style={[styles.word, selected && styles.wordSelected]}>
        {word}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  chipSelected: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  index: {
    color: '#666680',
    fontSize: 12,
    marginRight: 4,
    fontWeight: '500',
  },
  word: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  wordSelected: {
    color: '#FFFFFF',
  },
});
