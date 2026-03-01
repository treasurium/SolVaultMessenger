/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/wallet/screens/BackupPhraseScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Platform, ScrollView} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Button, WordChip} from '../../../shared/components';
import type {OnboardingStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'BackupPhrase'>;

export default function BackupPhraseScreen({navigation, route}: Props) {
  const {mnemonic} = route.params;
  const words = mnemonic.split(' ');

  useEffect(() => {
    // On Android, prevent screenshots with FLAG_SECURE
    // This would be implemented via a native module in production:
    // NativeModules.FlagSecure?.activate();
    // return () => NativeModules.FlagSecure?.deactivate();
  }, []);

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        bounces={false}>
        <Text style={styles.title}>Recovery Phrase</Text>

        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Write these words down on paper. Never share them with anyone. This
            is the ONLY way to recover your wallet.
          </Text>
        </View>

        <View style={styles.wordGrid}>
          {words.map((word, index) => (
            <View key={index} style={styles.wordCell}>
              <WordChip word={word} index={index} />
            </View>
          ))}
        </View>

        <View style={styles.rules}>
          <Text style={styles.ruleText}>• Do NOT take a screenshot</Text>
          <Text style={styles.ruleText}>• Do NOT copy to clipboard</Text>
          <Text style={styles.ruleText}>• Write on paper and store safely</Text>
        </View>

        <Button
          title="I've Saved My Phrase"
          onPress={() => navigation.navigate('ConfirmPhrase', {mnemonic})}
          style={styles.button}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#2A1A00',
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  warningText: {
    color: '#FFB84D',
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  wordCell: {
    width: '33%',
    padding: 2,
  },
  rules: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  ruleText: {
    color: '#A0A0B8',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 20,
  },
  button: {
    marginBottom: 20,
  },
});
