import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';

interface HeadsUpProps {
  items: string[];
}

export const HeadsUp: React.FC<HeadsUpProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Zap size={18} color="#f59e0b" fill="#f59e0b" />
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
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
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
    fontSize: 16,
    color: '#6b7280',
    marginTop: -1,
  },
  itemText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 20,
    flex: 1,
  },
});
