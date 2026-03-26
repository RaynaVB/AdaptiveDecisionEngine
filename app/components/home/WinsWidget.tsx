import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, ShieldCheck, Trophy } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows, Spacing } from '../../constants/Theme';
import { StreakData } from '../../../src/services/StreakService';

interface WinsWidgetProps {
  streakData: StreakData;
}

const MILESTONE_DAYS = [3, 7, 14, 30, 60, 100];

export const WinsWidget: React.FC<WinsWidgetProps> = ({ streakData }) => {
  const { loggingStreak, longestLoggingStreak, symptomFreeStreak } = streakData;

  // Only render when there's something worth celebrating
  if (loggingStreak < 2) return null;

  const isNewRecord = loggingStreak >= longestLoggingStreak && loggingStreak > 1;
  const isMilestoneDay = MILESTONE_DAYS.includes(loggingStreak);
  const showSymptomFree = symptomFreeStreak >= 3;

  return (
    <View style={styles.container}>
      {/* Logging streak chip */}
      <View style={[styles.chip, isMilestoneDay && styles.chipMilestone]}>
        <Flame size={16} color={Colors.success} />
        <View style={styles.chipText}>
          <Text style={styles.chipCount}>{loggingStreak}</Text>
          <Text style={styles.chipLabel}>day streak</Text>
        </View>
      </View>

      {/* Symptom-free chip */}
      {showSymptomFree && (
        <View style={[styles.chip, styles.chipSymptomFree]}>
          <ShieldCheck size={16} color={Colors.moodIcon} />
          <View style={styles.chipText}>
            <Text style={[styles.chipCount, { color: Colors.moodIcon }]}>{symptomFreeStreak}</Text>
            <Text style={styles.chipLabel}>symptom-free</Text>
          </View>
        </View>
      )}

      {/* Personal record badge */}
      {isNewRecord && isMilestoneDay && (
        <View style={styles.recordBadge}>
          <Trophy size={12} color={Colors.accent} />
          <Text style={styles.recordText}>Personal best</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.s2,
    paddingHorizontal: 4,
    marginBottom: Spacing.s4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s2,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.ambient,
  },
  chipMilestone: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  chipSymptomFree: {
    backgroundColor: Colors.moodContainer,
  },
  chipText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  chipCount: {
    ...Typography.title,
    fontSize: 16,
    color: Colors.success,
  },
  chipLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    textTransform: 'lowercase',
  },
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentContainer,
    borderRadius: Radii.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  recordText: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.accent,
    textTransform: 'lowercase',
  },
});
