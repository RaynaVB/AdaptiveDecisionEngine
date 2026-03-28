import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, X, FlaskConical } from 'lucide-react-native';
import { PatternAlert } from '../../src/models/types';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

interface EmergingPatternCardProps {
  alert: PatternAlert;
  onStartExperiment: (experimentId: string) => void;
  onDismiss: (alertId: string) => void;
}

export const EmergingPatternCard: React.FC<EmergingPatternCardProps> = ({
  alert,
  onStartExperiment,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={18} color={Colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>EMERGING PATTERN</Text>
        </View>
        <TouchableOpacity
          onPress={() => onDismiss(alert.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dismissButton}
        >
          <X size={16} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Title + summary */}
      <Text style={styles.title}>{alert.title}</Text>
      <Text style={styles.summary}>{alert.summary}</Text>

      {/* Evidence pill + CTA row */}
      <View style={styles.footer}>
        <View style={styles.evidencePill}>
          <Text style={styles.evidenceText}>
            {alert.evidence.streakLength} days in a row
          </Text>
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => onStartExperiment(alert.suggestedExperimentId)}
        >
          <FlaskConical size={14} color={Colors.onPrimaryContrast} style={{ marginRight: 6 }} />
          <Text style={styles.ctaText}>Test This</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.warningContainer,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.warning,
    padding: Spacing.s4,
    marginBottom: Spacing.s4,
    ...Shadows.ambient,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s2,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerLabel: {
    ...Typography.label,
    color: Colors.onWarningContainer,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dismissButton: {
    padding: 2,
  },
  title: {
    ...Typography.title,
    color: Colors.onSurface,
    fontSize: 16,
    marginBottom: Spacing.s2,
  },
  summary: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.s3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  evidencePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full ?? 100,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  evidenceText: {
    ...Typography.label,
    color: Colors.onWarningContainer,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'none',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
    flex: 1,
    justifyContent: 'center',
  },
  ctaText: {
    ...Typography.label,
    color: Colors.onPrimaryContrast,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'none',
  },
});
