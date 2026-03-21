import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Insight } from '../../../src/models/types';
import { Lightbulb } from 'lucide-react-native';
import { MICRO_DISCLAIMER_INSIGHTS } from '../../constants/legal';
import { Colors, Typography, Spacing, Radii } from '../../constants/Theme';

interface MicroInsightCardProps {
  insight: Insight;
}

export const MicroInsightCard: React.FC<MicroInsightCardProps> = ({ insight }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb size={18} color={Colors.primary} fill={Colors.primary} />
        <Text style={styles.headerText}>Insight</Text>
      </View>
      
      <Text style={styles.title}>{insight.title}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.confidenceLabel}>Confidence: </Text>
        <Text style={[
          styles.confidenceValue,
          { color: insight.confidenceLevel === 'high' ? Colors.primary : Colors.onSurfaceVariant }
        ]}>
          {insight.confidenceLevel.charAt(0).toUpperCase() + insight.confidenceLevel.slice(1)}
        </Text>
      </View>

      <Text style={styles.disclaimerText}>{MICRO_DISCLAIMER_INSIGHTS}</Text>
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
    marginBottom: Spacing.s3,
    gap: 8,
  },
  headerText: {
    ...Typography.title,
    fontSize: 18,
    color: Colors.onSurface,
  },
  title: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: Spacing.s3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textTransform: 'none',
  },
  confidenceValue: {
    ...Typography.label,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'none',
  },
  disclaimerText: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.s3,
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
