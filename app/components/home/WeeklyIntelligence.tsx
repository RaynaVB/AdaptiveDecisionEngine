import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WeeklyItem } from '../../../src/models/types';
import { Brain, ChevronRight } from 'lucide-react-native';

interface WeeklyIntelligenceProps {
  items: WeeklyItem[];
  onStartTest: (item: WeeklyItem) => void;
}

export const WeeklyIntelligence: React.FC<WeeklyIntelligenceProps> = ({ items, onStartTest }) => {
  // Focus on the top causal insight (pattern or trend)
  const mainInsight = items.find(item => item.type === 'pattern' || item.type === 'trend');
  
  if (!mainInsight) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Brain size={18} color="#10b981" />
        <Text style={styles.headerText}>This Week</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.insightTitle}>{mainInsight.title}</Text>
        <Text style={styles.insightSummary}>{mainInsight.summary}</Text>
        
        {mainInsight.metadata?.triggers && (
          <View style={styles.triggersSection}>
            <Text style={styles.triggersLabel}>Top triggers:</Text>
            {mainInsight.metadata.triggers.map((trigger: string, i: number) => (
              <Text key={i} style={styles.triggerItem}>• {trigger}</Text>
            ))}
          </View>
        )}
        
        {mainInsight.metadata?.suggestedFocus && (
          <View style={styles.focusSection}>
            <Text style={styles.focusLabel}>Suggested focus:</Text>
            <Text style={styles.focusText}>{mainInsight.metadata.suggestedFocus}</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.actionButton} onPress={() => onStartTest(mainInsight)}>
          <Text style={styles.actionButtonText}>Start 5-Day Test</Text>
          <ChevronRight size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  insightSummary: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  triggersSection: {
    marginBottom: 16,
  },
  triggersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  triggerItem: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 2,
  },
  focusSection: {
    marginBottom: 20,
  },
  focusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  focusText: {
    fontSize: 14,
    color: '#4b5563',
  },
  actionButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
