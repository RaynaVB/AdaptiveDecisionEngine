import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExperimentRun } from '../../src/models/healthlab';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { Beaker, ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

interface ActiveExperimentCardProps {
  experiment: ExperimentRun;
  onPress: (experiment: ExperimentRun) => void;
  onLogProgress?: (experiment: ExperimentRun) => void;
}

export const ActiveExperimentCard: React.FC<ActiveExperimentCardProps> = ({ experiment, onPress, onLogProgress }) => {
  const definition = EXPERIMENT_LIBRARY.find((e: any) => e.id === experiment.experimentId || e.id === experiment.id);
  const startedAtStr = experiment.startedAt || experiment.startDate || new Date().toISOString();
  const dayNumber = Math.floor((Date.now() - new Date(startedAtStr).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = definition?.durationDays || 5;

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(experiment)}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Beaker size={20} color={Colors.onPrimaryContrast} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>ACTIVE EXPERIMENT</Text>
          <Text style={styles.title}>{experiment.template?.name || definition?.name || 'Active Experiment'}</Text>
        </View>
        <ChevronRight size={20} color={Colors.onPrimaryAlpha50} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.dayText}>Day {dayNumber} of {totalDays}</Text>
        <Text style={styles.motivation}>
          Building patterns to improve {definition?.category || 'health'}.
        </Text>
      </View>
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
    backgroundColor: Colors.onPrimaryAlpha15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerLabel: {
    ...Typography.label,
    color: Colors.onPrimaryAlpha70,
    fontSize: 10,
    marginBottom: 2,
    textTransform: 'none',
  },
  title: {
    ...Typography.title,
    color: Colors.onPrimaryContrast,
    fontSize: 18,
  },
  content: {
    marginBottom: Spacing.s4,
  },
  dayText: {
    ...Typography.label,
    color: Colors.onPrimaryAlpha90,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'none',
  },
  motivation: {
    ...Typography.body,
    color: Colors.onPrimaryAlpha70,
    fontSize: 14,
    lineHeight: 20,
  },
});
