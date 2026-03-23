import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WeeklyItem } from '../../../src/models/types';
import { Brain, ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../constants/Theme';

interface WeeklyIntelligenceProps {
  items: WeeklyItem[];
  onStartTest: (item: WeeklyItem) => void;
}

export const WeeklyIntelligence: React.FC<WeeklyIntelligenceProps> = ({ items, onStartTest }) => {
  // Focus on the top causal insight (pattern or trend)
  const mainInsight = items.find(item => item.type === 'pattern' || item.type === 'trend');
  
  if (!mainInsight) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Brain size={18} color={Colors.surfaceContainerHighest} />
          <Text style={[styles.headerText, { color: Colors.onSurfaceVariant }]}>Weekly Intelligence</Text>
        </View>
        <View style={[styles.content, { backgroundColor: Colors.surfaceLowest, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.surfaceContainerHighest }]}>
          <Text style={[styles.insightTitle, { color: Colors.onSurfaceVariant }]}>Building your profile...</Text>
          <Text style={styles.insightSummary}>
            The engine needs about 5–7 days of logs to identify your unique weekly patterns and causal links.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Brain size={18} color={Colors.accent} />
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
          <ChevronRight size={18} color={Colors.onPrimaryContrast} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.s1,
    marginBottom: Spacing.s6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s4,
    gap: 8,
  },
  headerText: {
    ...Typography.title,
    fontSize: 18,
    color: Colors.onSurface,
  },
  content: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl,
    padding: Spacing.s5,
    ...Shadows.ambient,
  },
  insightTitle: {
    ...Typography.title,
    fontSize: 16,
    color: Colors.onSurface,
    marginBottom: Spacing.s2,
  },
  insightSummary: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: Spacing.s4,
  },
  triggersSection: {
    marginBottom: Spacing.s4,
  },
  triggersLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.onSurface,
    marginBottom: Spacing.s1,
  },
  triggerItem: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  focusSection: {
    marginBottom: Spacing.s5,
  },
  focusLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.onSurface,
    marginBottom: Spacing.s1,
  },
  focusText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  actionButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.lg,
    gap: 8,
  },
  actionButtonText: {
    ...Typography.title,
    fontSize: 15,
    color: Colors.onPrimaryContrast,
  },
});
