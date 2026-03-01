/*
 * SolVault Messenger - Encrypted On-Chain Messaging on Solana
 * Copyright (C) 2026 Treasurium.ai
 * Licensed under GPLv3 - see LICENSE file
 */
// src/app/navigation.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// Onboarding screens
import WelcomeScreen from '../features/auth/screens/WelcomeScreen';
import SignupScreen from '../features/auth/screens/SignupScreen';
import CreateWalletScreen from '../features/wallet/screens/CreateWalletScreen';
import BackupPhraseScreen from '../features/wallet/screens/BackupPhraseScreen';
import ConfirmPhraseScreen from '../features/wallet/screens/ConfirmPhraseScreen';

// Main app screens
import WalletHomeScreen from '../features/wallet/screens/WalletHomeScreen';
import DepositScreen from '../features/wallet/screens/DepositScreen';
import SendSolScreen from '../features/wallet/screens/SendSolScreen';
import ChatListScreen from '../features/messaging/screens/ChatListScreen';
import ConversationScreen from '../features/messaging/screens/ConversationScreen';
import NewMessageScreen from '../features/messaging/screens/NewMessageScreen';
import ContactsScreen from '../features/contacts/screens/ContactsScreen';
import SettingsScreen from '../features/auth/screens/SettingsScreen';

// Types
import type {
  OnboardingStackParamList,
  WalletStackParamList,
  ChatStackParamList,
  MainTabParamList,
} from '../shared/types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const WalletStackNav = createNativeStackNavigator<WalletStackParamList>();
const ChatStackNav = createNativeStackNavigator<ChatStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({icon, focused}: {icon: string; focused: boolean}) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabIconText, focused && styles.tabIconFocused]}>
        {icon}
      </Text>
    </View>
  );
}

function WalletNavigator() {
  return (
    <WalletStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: '#0D0D1A'},
      }}>
      <WalletStackNav.Screen name="WalletHome" component={WalletHomeScreen} />
      <WalletStackNav.Screen name="Deposit" component={DepositScreen} />
      <WalletStackNav.Screen name="SendSol" component={SendSolScreen} />
    </WalletStackNav.Navigator>
  );
}

function ChatNavigator() {
  return (
    <ChatStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: '#0D0D1A'},
      }}>
      <ChatStackNav.Screen name="ChatList" component={ChatListScreen} />
      <ChatStackNav.Screen name="NewMessage" component={NewMessageScreen} />
      <ChatStackNav.Screen name="Conversation" component={ConversationScreen} />
    </ChatStackNav.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <MainTab.Navigator
      initialRouteName="ChatTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D0D1A',
          borderTopColor: '#1A1A2E',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#14F195',
        tabBarInactiveTintColor: '#666680',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <MainTab.Screen
        name="WalletTab"
        component={WalletNavigator}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({focused}) => <TabIcon icon="💎" focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="ChatTab"
        component={ChatNavigator}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({focused}) => <TabIcon icon="💬" focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          tabBarLabel: 'Contacts',
          tabBarIcon: ({focused}) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({focused}) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </MainTab.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: '#0D0D1A'},
        animation: 'slide_from_right',
      }}>
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="Signup" component={SignupScreen} />
      <OnboardingStack.Screen
        name="CreateWallet"
        component={CreateWalletScreen}
      />
      <OnboardingStack.Screen
        name="BackupPhrase"
        component={BackupPhraseScreen}
      />
      <OnboardingStack.Screen
        name="ConfirmPhrase"
        component={ConfirmPhraseScreen}
      />
    </OnboardingStack.Navigator>
  );
}

interface AppNavigationProps {
  hasWallet: boolean;
}

export default function AppNavigation({hasWallet}: AppNavigationProps) {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#6C63FF',
          background: '#0D0D1A',
          card: '#0D0D1A',
          text: '#FFFFFF',
          border: '#1A1A2E',
          notification: '#6C63FF',
        },
        fonts: {
          regular: {fontFamily: 'System', fontWeight: '400'},
          medium: {fontFamily: 'System', fontWeight: '500'},
          bold: {fontFamily: 'System', fontWeight: '700'},
          heavy: {fontFamily: 'System', fontWeight: '900'},
        },
      }}>
      {hasWallet ? <MainTabs /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 24,
  },
  tabIconFocused: {
    transform: [{scale: 1.1}],
  },
});
