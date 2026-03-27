import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '../constants/Theme';

interface AppHeaderProps {
  showTagline?: boolean;
  style?: ViewStyle;
}

const AppHeader: React.FC<AppHeaderProps> = ({ showTagline = false, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Veyra</Text>
      </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
    marginBottom: Spacing.s1,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
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
