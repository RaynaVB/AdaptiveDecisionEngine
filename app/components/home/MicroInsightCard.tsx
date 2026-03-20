import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Insight } from '../../../src/models/types';
import { Lightbulb } from 'lucide-react-native';
import { MICRO_DISCLAIMER_INSIGHTS } from '../../constants/legal';

interface MicroInsightCardProps {
  insight: Insight;
}

export const MicroInsightCard: React.FC<MicroInsightCardProps> = ({ insight }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb size={18} color="#f59e0b" fill="#f59e0b" />
        <Text style={styles.headerText}>Insight</Text>
      </View>
      
      <Text style={styles.title}>{insight.title}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.confidenceLabel}>Confidence: </Text>
        <Text style={[
          styles.confidenceValue,
          { color: insight.confidenceLevel === 'high' ? '#10b981' : insight.confidenceLevel === 'medium' ? '#3b82f6' : '#6b7280' }
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
    paddingHorizontal: 4,
    marginBottom: 24,
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
  title: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
