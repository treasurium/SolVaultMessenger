/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/features/wallet/screens/ConfirmPhraseScreen.tsx
import React, {useState, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Button, WordChip} from '../../../shared/components';
import type {OnboardingStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ConfirmPhrase'>;

const MAX_WRONG_ATTEMPTS = 3;

export default function ConfirmPhraseScreen({navigation, route}: Props) {
  const {mnemonic} = route.params;
  const correctWords = mnemonic.split(' ');

  const shuffledWords = useMemo(() => {
    return [...correctWords].sort(() => Math.random() - 0.5);
  }, []);

  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const availableWords = shuffledWords.filter(
    (word, idx) => {
      // Count how many times this word appears in shuffled
      const shuffledCount = shuffledWords.slice(0, idx + 1).filter(w => w === word).length;
      // Count how many times it's been selected
      const selectedCount = selectedWords.filter(w => w === word).length;
      return shuffledCount > selectedCount;
    },
  );

  const handleSelectWord = (word: string) => {
    const nextIndex = selectedWords.length;
    const expectedWord = correctWords[nextIndex];

    if (word === expectedWord) {
      setError(null);
      const newSelected = [...selectedWords, word];
      setSelectedWords(newSelected);

      // Check if complete
      if (newSelected.length === correctWords.length) {
        // Success! Navigate forward - wallet is already created
        // The app will detect wallet is initialized and switch to main tabs
        Alert.alert(
          'Wallet Secured!',
          'Your recovery phrase has been verified. Your wallet is ready to use.',
          [{text: 'Continue', onPress: () => {}}],
        );
      }
    } else {
      const attempts = wrongAttempts + 1;
      setWrongAttempts(attempts);

      if (attempts >= MAX_WRONG_ATTEMPTS) {
        // Reset and go back to show phrase
        setError('Too many wrong attempts. Showing phrase again.');
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        setError(
          `Wrong word. ${MAX_WRONG_ATTEMPTS - attempts} attempt(s) remaining.`,
        );
      }
    }
  };

  const handleRemoveWord = () => {
    if (selectedWords.length > 0) {
      setSelectedWords(prev => prev.slice(0, -1));
      setError(null);
    }
  };

  const isComplete = selectedWords.length === correctWords.length;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <Text style={styles.title}>Confirm Your Phrase</Text>
        <Text style={styles.description}>
          Tap the words in the correct order to verify you saved your recovery
          phrase.
        </Text>

        {/* Selected words area */}
        <View style={styles.selectedArea}>
          {correctWords.map((_, index) => (
            <View key={index} style={styles.slot}>
              {selectedWords[index] ? (
                <WordChip
                  word={selectedWords[index]}
                  index={index}
                  selected
                  onPress={
                    index === selectedWords.length - 1
                      ? handleRemoveWord
                      : undefined
                  }
                />
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.emptySlotText}>{index + 1}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Available words to select */}
        {!isComplete && (
          <View style={styles.availableArea}>
            <Text style={styles.availableLabel}>Tap the next word:</Text>
            <View style={styles.wordRow}>
              {availableWords.map((word, index) => (
                <WordChip
                  key={`${word}-${index}`}
                  word={word}
                  onPress={() => handleSelectWord(word)}
                />
              ))}
            </View>
          </View>
        )}

        {isComplete && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Recovery phrase verified successfully!
            </Text>
          </View>
        )}
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
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#A0A0B8',
    marginBottom: 24,
    lineHeight: 22,
  },
  selectedArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    minHeight: 180,
  },
  slot: {
    width: '33%',
    padding: 2,
    minHeight: 44,
  },
  emptySlot: {
    borderWidth: 1,
    borderColor: '#2A2A3E',
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  emptySlotText: {
    color: '#3A3A50',
    fontSize: 12,
    fontWeight: '500',
  },
  error: {
    color: '#FF4D4D',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  availableArea: {
    marginTop: 8,
  },
  availableLabel: {
    color: '#A0A0B8',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  successContainer: {
    backgroundColor: '#0A2A0A',
    borderWidth: 1,
    borderColor: '#00CC66',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  successText: {
    color: '#00CC66',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
