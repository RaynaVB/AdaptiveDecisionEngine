import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Recommendation } from '../../../src/models/types';
import { Target, Check, X, ShieldQuestion } from 'lucide-react-native';
import { MICRO_DISCLAIMER_RECOMMENDATIONS } from '../../constants/legal';
import { Colors, Typography, Spacing, Radii, Shadows } from '../../constants/Theme';
import { RecommendationCard } from '../RecommendationCard';

interface HeroActionProps {
  recommendation: Recommendation;
  onStart: (recommendation: Recommendation) => void;
  onMaybe: (recommendation: Recommendation) => void;
  onDismiss: (recommendation: Recommendation) => void;
}

export const HeroAction: React.FC<HeroActionProps> = ({ recommendation, onStart, onMaybe, onDismiss }) => {
  return (
    <View style={styles.outerContainer}>
      <RecommendationCard
        recommendation={recommendation}
        variant="hero"
        onAccept={onStart}
        onMaybe={onMaybe}
        onDismiss={onDismiss}
        showWhyThis={false}
      />
      <Text style={styles.disclaimerText}>{MICRO_DISCLAIMER_RECOMMENDATIONS}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.xl,
    padding: Spacing.s5,
    marginBottom: Spacing.s4,
    ...Shadows.ambient,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s4,
    gap: 8,
  },
  headerText: {
    ...Typography.label,
    color: Colors.primary,
    letterSpacing: 1,
  },
  title: {
    ...Typography.title,
    fontSize: 22,
    color: Colors.onSurface,
    marginBottom: Spacing.s2,
  },
  summary: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: Spacing.s6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s6,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  confidenceLabel: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  confidenceValue: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radii.lg,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    ...Typography.title,
    fontSize: 16,
    color: Colors.onPrimaryContrast,
  },
  outlineButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerText: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.s5,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  outerContainer: {
    marginBottom: Spacing.s4,
  },
});
