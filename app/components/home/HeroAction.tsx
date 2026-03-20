import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Recommendation } from '../../../src/models/types';
import { Target } from 'lucide-react-native';
import { MICRO_DISCLAIMER_RECOMMENDATIONS } from '../../constants/legal';

interface HeroActionProps {
  recommendation: Recommendation;
  onStart: (recommendation: Recommendation) => void;
  onMaybe: (recommendation: Recommendation) => void;
  onDismiss: (recommendation: Recommendation) => void;
}

export const HeroAction: React.FC<HeroActionProps> = ({ recommendation, onStart, onMaybe, onDismiss }) => {
  const confidenceDots = () => {
    const dots = [];
    const count = recommendation.confidenceLevel === 'high' ? 5 : recommendation.confidenceLevel === 'medium' ? 3 : 1;
    for (let i = 0; i < 5; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i < count ? '#3b82f6' : '#e5e7eb' }
          ]}
        />
      );
    }
    return dots;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Target size={18} color="#3b82f6" />
        <Text style={styles.headerText}>TODAY’S FOCUS</Text>
      </View>
      
      <Text style={styles.title}>{recommendation.title}</Text>
      <Text style={styles.summary}>{recommendation.summary}</Text>
      
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Confidence: </Text>
        <View style={styles.dotsContainer}>{confidenceDots()}</View>
        <Text style={styles.confidenceText}>{recommendation.confidenceLevel === 'high' ? 'High' : recommendation.confidenceLevel === 'medium' ? 'Medium' : 'Low'}</Text>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onStart(recommendation)}>
          <Text style={styles.primaryButtonText}>
            {recommendation.associatedExperimentId ? 'Start Now' : 'Try it now'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.maybeButton} onPress={() => onMaybe(recommendation)}>
          <Text style={styles.maybeButtonText}>Maybe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={() => onDismiss(recommendation)}>
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimerText}>{MICRO_DISCLAIMER_RECOMMENDATIONS}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  summary: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  maybeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.8,
    alignItems: 'center',
  },
  maybeButtonText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 14,
  },
  dismissButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.8,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
