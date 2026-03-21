import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart2 } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows, Spacing } from '../../constants/Theme';

export interface WeekAtGlanceData {
  label: string;
  score: number;
  dateStr: string;
  displayDate: string;
  hasEvents: boolean;
  eventCount: number;
}

interface WeekAtAGlanceProps {
  data: WeekAtGlanceData[];
  onPressDay: (data: WeekAtGlanceData) => void;
}

export const WeekAtAGlance: React.FC<WeekAtAGlanceProps> = ({ data, onPressDay }) => {
  const peakDay = [...data].sort((a, b) => b.score - a.score)[0];
  
  // Simple trend logic
  const firstHalf = data.slice(0, 3).reduce((acc, curr) => acc + curr.score, 0);
  const secondHalf = data.slice(3).reduce((acc, curr) => acc + curr.score, 0);
  const trend = secondHalf < firstHalf ? 'Slight improvement' : secondHalf > firstHalf ? 'Increased load' : 'Stable';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BarChart2 size={18} color={Colors.primary} />
        <Text style={styles.headerText}>This Week</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.chartTitle}>Symptom Load</Text>
        
        <View style={styles.chartRow}>
          {data.map((day, idx) => {
            let bgColor = Colors.surfaceContainerLow;
            if (day.score > 0) {
              if (day.score <= 3) bgColor = Colors.warning; // Mild
              else if (day.score <= 6) bgColor = Colors.warning; // Moderate (approx)
              else bgColor = Colors.error; // Severe
            }
            
            return (
              <TouchableOpacity 
                key={idx} 
                style={styles.dayColumn}
                onPress={() => onPressDay(day)}
              >
                <View style={[styles.dot, { backgroundColor: bgColor }]}>
                  {day.score > 0 && <Text style={styles.scoreText}>{day.score}</Text>}
                </View>
                <Text style={styles.dayLabel}>{day.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.peakText}>
            Peak: <Text style={{ fontWeight: '700' }}>{peakDay?.displayDate.split(',')[0]} ({peakDay?.score})</Text>
          </Text>
          <Text style={styles.trendText}>
            Trend: <Text style={{ fontWeight: '700' }}>{trend}</Text>
          </Text>
        </View>
      </View>
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
    marginBottom: 16,
    gap: 8,
  },
  headerText: {
    ...Typography.title,
    fontSize: 18,
    color: Colors.onSurface,
  },
  content: {
    backgroundColor: Colors.background,
    borderRadius: Radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainer,
    ...Shadows.ambient,
  },
  chartTitle: {
    ...Typography.label,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginBottom: 20,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  scoreText: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  dayLabel: {
    ...Typography.label,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  footer: {
    gap: 4,
  },
  peakText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  trendText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
});
