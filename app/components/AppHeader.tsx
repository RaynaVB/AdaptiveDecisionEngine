import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/Theme';

interface AppHeaderProps {
  showTagline?: boolean;
  style?: ViewStyle;
}

const AppHeader: React.FC<AppHeaderProps> = ({ showTagline = false, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.appName}>Veyra</Text>
      {showTagline && (
        <Text style={styles.tagline}>Understand Your Patterns</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    ...Typography.headline,
    fontSize: 36,
    color: Colors.onSurface,
    textAlign: 'center',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.s1,
    opacity: 0.9,
  },
});

export default AppHeader;
