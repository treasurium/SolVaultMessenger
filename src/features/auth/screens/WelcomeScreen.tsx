// src/features/auth/screens/WelcomeScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenContainer, Button} from '../../../shared/components';
import type {OnboardingStackParamList} from '../../../shared/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen({navigation}: Props) {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🔐</Text>
          </View>
          <Text style={styles.title}>SolVault</Text>
          <Text style={styles.subtitle}>Messenger</Text>
          <Text style={styles.tagline}>
            Non-custodial encrypted messaging{'\n'}with a built-in Solana wallet
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureRow icon="🔒" text="End-to-end encrypted on-chain messages" />
          <FeatureRow icon="💎" text="Send & receive SOL natively" />
          <FeatureRow icon="🔑" text="You own your keys — non-custodial" />
        </View>

        <View style={styles.actions}>
          <Button
            title="Create New Wallet"
            onPress={() => navigation.navigate('CreateWallet')}
          />
          <Button
            title="I Already Have a Wallet"
            variant="secondary"
            onPress={() => navigation.navigate('Signup')}
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function FeatureRow({icon, text}: {icon: string; text: string}) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  hero: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#A0A0B8',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 14,
    color: '#666680',
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    paddingHorizontal: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 15,
    color: '#CCCCDD',
    flex: 1,
  },
  actions: {
    marginBottom: 20,
  },
  secondaryButton: {
    marginTop: 12,
  },
});
