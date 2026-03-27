import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExperimentRun } from '../../src/models/healthlab';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { Beaker, ChevronRight, ClipboardList } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

interface ActiveExperimentCardProps {
  experiment: ExperimentRun;
  onPress: (experiment: ExperimentRun) => void;
  onLogProgress?: (experiment: ExperimentRun) => void;
}

const EVENT_LABELS: Record<string, string> = {
  meal_log:    'Meals',
  snack_log:   'Snacks',
  dinner_log:  'Dinner',
  energy_log:  'Energy',
  mood_log:    'Mood',
  symptom_log: 'Symptoms',
  stress_log:  'Stress',
  sleep_log:   'Sleep',
};

export const ActiveExperimentCard: React.FC<ActiveExperimentCardProps> = ({ experiment, onPress }) => {
  // templateId is canonical; fall back to legacy fields for old documents
  const effectiveTemplateId = experiment.templateId || experiment.experimentId || experiment.id;
  const definition = EXPERIMENT_LIBRARY.find(e => e.id === effectiveTemplateId);

  const startedAtStr = experiment.startedAt || experiment.startDate || new Date().toISOString();
  const totalDays    = definition?.durationDays ?? 5;
  const dayNumber    = Math.min(
    Math.floor((Date.now() - new Date(startedAtStr).getTime()) / (1000 * 60 * 60 * 24)) + 1,
    totalDays
  );
  const progress = dayNumber / totalDays;

  const requiredLabels = (definition?.requiredEvents ?? [])
    .map(e => EVENT_LABELS[e] ?? e)
    .join(' · ');

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(experiment)}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Beaker size={20} color={Colors.onPrimaryContrast} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>ACTIVE EXPERIMENT</Text>
          <Text style={styles.title} numberOfLines={1}>
            {experiment.template?.name ?? definition?.name ?? 'Active Experiment'}
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.onPrimaryAlphaMedium} />
      </View>

      {/* Day counter + progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.dayRow}>
          <Text style={styles.dayText}>Day {dayNumber} of {totalDays}</Text>
          <Text style={styles.dayPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>

      {/* Track-today nudge */}
      {requiredLabels.length > 0 && (
        <View style={styles.nudgeRow}>
          <ClipboardList size={13} color={Colors.onPrimaryAlphaMedium} />
          <Text style={styles.nudgeText}>Log today: {requiredLabels}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    padding: Spacing.s4,
    marginBottom: Spacing.s4,
    ...Shadows.ambient,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.onPrimaryAlphaLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerLabel: {
    ...Typography.label,
    color: Colors.onPrimaryAlphaMedium,
    fontSize: 10,
    marginBottom: 2,
    textTransform: 'none',
  },
  title: {
    ...Typography.title,
    color: Colors.onPrimaryContrast,
    fontSize: 18,
  },
  progressSection: {
    marginBottom: Spacing.s3,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayText: {
    ...Typography.label,
    color: Colors.onPrimaryContrast,
    fontSize: 12,
    textTransform: 'none',
  },
  dayPct: {
    ...Typography.label,
    color: Colors.onPrimaryAlphaMedium,
    fontSize: 11,
    textTransform: 'none',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.onPrimaryAlphaLow,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.onPrimaryContrast,
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.s2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.onPrimaryAlphaLow,
  },
  nudgeText: {
    ...Typography.caption,
    color: Colors.onPrimaryAlphaMedium,
    fontSize: 12,
    flex: 1,
  },
});
