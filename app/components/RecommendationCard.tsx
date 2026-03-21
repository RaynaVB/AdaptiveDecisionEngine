import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recommendation, FeedbackOutcome } from '../../src/models/types';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';
import { Check, X, ShieldQuestion, History, Target } from 'lucide-react-native';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAccept: (rec: Recommendation) => void;
  onMaybe: (rec: Recommendation) => void;
  onDismiss: (rec: Recommendation) => void;
  variant?: 'hero' | 'default';
  isActed?: boolean;
  headerLabel?: string;
  headerIcon?: React.ReactNode;
  showWhyThis?: boolean;
  showConfidence?: boolean;
  actionState?: FeedbackOutcome | null;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onAccept,
  onMaybe,
  onDismiss,
  variant = 'default',
  isActed = false,
  headerLabel,
  headerIcon,
  showWhyThis = true,
  showConfidence = true,
  actionState,
}) => {
  const isHero = variant === 'hero';

  return (
    <View style={[
      styles.card,
      isHero ? styles.heroCard : styles.defaultCard,
      isActed && styles.actedCard
    ]}>
      {(headerLabel || headerIcon) && (
        <View style={styles.header}>
          {headerIcon || (isHero && <Target size={18} color={Colors.primary} />)}
          <Text style={styles.headerText}>{headerLabel || (isHero ? 'TODAY’S FOCUS' : '')}</Text>
        </View>
      )}

      <Text style={[styles.title, isHero && styles.heroTitle]}>{recommendation.title}</Text>
      <Text style={styles.summary}>{recommendation.summary}</Text>

      {showConfidence && (
        <View style={styles.metaRow}>
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceLabel}>Confidence: </Text>
            <Text style={styles.confidenceValue}>{recommendation.confidenceLevel.toUpperCase()}</Text>
          </View>
        </View>
      )}

      {showWhyThis && recommendation.whyThis && recommendation.whyThis.length > 0 && (
        <View style={styles.whySection}>
          <Text style={styles.whyHeader}>WHY THIS?</Text>
          <Text style={styles.whyText}>
            {recommendation.whyThis.map(w => w.label).join('. ')}
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            (actionState === 'accepted' || (!actionState && isHero)) ? styles.acceptedButtonPressed : styles.outlineButton
          ]}
          onPress={() => onAccept(recommendation)}
        >
          <Check size={20} color={(actionState === 'accepted' || (!actionState && isHero)) ? Colors.onPrimaryContrast : Colors.primary} />
          <Text style={[
            styles.actionButtonLabel,
            styles.primaryButtonText,
            { color: (actionState === 'accepted' || (!actionState && isHero)) ? Colors.onPrimaryContrast : Colors.onSurfaceVariant }
          ]}>
            {isHero ? (recommendation.associatedExperimentId ? 'START' : 'ACCEPT') : 'CHECK'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.outlineButton,
            actionState === 'maybe' && styles.maybeButtonPressed
          ]}
          onPress={() => onMaybe(recommendation)}
        >
          <ShieldQuestion size={20} color={actionState === 'maybe' ? Colors.onPrimaryContrast : (isHero ? Colors.primary : Colors.secondary)} />
          <Text style={[
            styles.actionButtonLabel,
            { color: actionState === 'maybe' ? Colors.onPrimaryContrast : Colors.onSurfaceVariant }
          ]}>MAYBE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.outlineButton,
            actionState === 'rejected' || actionState === 'dismissed' ? styles.rejectedButtonPressed : null
          ]}
          onPress={() => onDismiss(recommendation)}
        >
          <X size={20} color={actionState === 'rejected' || actionState === 'dismissed' ? Colors.onPrimaryContrast : Colors.onSurfaceVariant} />
          <Text style={[
            styles.actionButtonLabel,
            { color: actionState === 'rejected' || actionState === 'dismissed' ? Colors.onPrimaryContrast : Colors.onSurfaceVariant }
          ]}>DISMISS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    padding: Spacing.s5,
    marginBottom: Spacing.s4,
    ...Shadows.ambient,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  defaultCard: {
    backgroundColor: Colors.surfaceLowest,
  },
  heroCard: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  actedCard: {
    opacity: 0.6,
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
    fontSize: 20,
    color: Colors.onSurface,
    marginBottom: Spacing.s2,
  },
  heroTitle: {
    fontSize: 22,
  },
  summary: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: Spacing.s4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s4,
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
    textTransform: 'none',
  },
  confidenceValue: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
  },
  whySection: {
    marginBottom: Spacing.s6,
    backgroundColor: Colors.surfaceSubtle,
    padding: Spacing.s3,
    borderRadius: Radii.md,
  },
  whyHeader: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  whyText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.onSurfaceMuted,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.lg,
    paddingVertical: 12,
    gap: 4,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainer,
    backgroundColor: 'transparent',
  },
  primaryButtonText: {
    ...Typography.title,
    fontSize: 10,
    color: Colors.onPrimaryContrast,
  },
  actionButtonLabel: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  acceptedButtonPressed: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  maybeButtonPressed: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  rejectedButtonPressed: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
});
