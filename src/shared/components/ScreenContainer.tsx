// src/shared/components/ScreenContainer.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  type ViewStyle,
} from 'react-native';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export default function ScreenContainer({
  children,
  style,
  padded = true,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe}>
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
