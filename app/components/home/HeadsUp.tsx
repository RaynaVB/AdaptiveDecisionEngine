import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii } from '../../constants/Theme';

interface HeadsUpProps {
  items: string[];
}

export const HeadsUp: React.FC<HeadsUpProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Zap size={18} color={Colors.accent} fill={Colors.accent} />
        <Text style={styles.headerText}>Heads Up</Text>
      </View>
      
      <View style={styles.itemsContainer}>
        {items.slice(0, 2).map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.itemText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.s2,
    marginBottom: Spacing.s5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s3,
    gap: 8,
  },
  headerText: {
    ...Typography.title,
    fontSize: 18,
    color: Colors.onSurface,
  },
  itemsContainer: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    ...Typography.body,
    color: Colors.accent,
    fontWeight: '700',
    marginTop: -2,
  },
  itemText: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    flex: 1,
  },
});
