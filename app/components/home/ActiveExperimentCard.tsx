import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExperimentRun } from '../../../src/models/healthlab';
import { EXPERIMENT_LIBRARY } from '../../../src/services/healthlab/definitions';
import { Beaker, ChevronRight } from 'lucide-react-native';

interface ActiveExperimentCardProps {
  experiment: ExperimentRun;
  onPress: (experiment: ExperimentRun) => void;
  onLogProgress: (experiment: ExperimentRun) => void;
}

export const ActiveExperimentCard: React.FC<ActiveExperimentCardProps> = ({ experiment, onPress, onLogProgress }) => {
  const definition = EXPERIMENT_LIBRARY.find(e => e.id === experiment.experimentId);
  const startedAtStr = experiment.startedAt || experiment.startDate || new Date().toISOString();
  const dayNumber = Math.floor((Date.now() - new Date(startedAtStr).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = definition?.durationDays || 5;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Beaker size={18} color="#8b5cf6" />
        <Text style={styles.headerText}>Active Experiment</Text>
      </View>
      
      <TouchableOpacity style={styles.content} onPress={() => onPress(experiment)}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{definition?.name || 'Unknown Experiment'}</Text>
            <Text style={styles.dayText}>Day {dayNumber} of {totalDays}</Text>
          </View>
          <ChevronRight size={20} color="#9ca3af" />
        </View>
        
        <Text style={styles.motivation}>
          You're building a pattern to improve your {definition?.category || 'health'}.
        </Text>
      </TouchableOpacity>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logButton} onPress={() => onLogProgress(experiment)}>
          <Text style={styles.logButtonText}>Log Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailsButton} onPress={() => onPress(experiment)}>
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    marginBottom: 16,
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  dayText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  motivation: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  logButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  detailsButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 14,
  },
});
