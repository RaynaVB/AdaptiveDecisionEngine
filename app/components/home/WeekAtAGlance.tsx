import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart2 } from 'lucide-react-native';

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
  const totalScore = data.reduce((acc, curr) => acc + curr.score, 0);
  
  // Simple trend logic
  const firstHalf = data.slice(0, 3).reduce((acc, curr) => acc + curr.score, 0);
  const secondHalf = data.slice(3).reduce((acc, curr) => acc + curr.score, 0);
  const trend = secondHalf < firstHalf ? 'Slight improvement' : secondHalf > firstHalf ? 'Increased load' : 'Stable';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BarChart2 size={18} color="#6366f1" />
        <Text style={styles.headerText}>This Week</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.chartTitle}>Symptom Load</Text>
        
        <View style={styles.chartRow}>
          {data.map((day, idx) => {
            let bgColor = '#f3f4f6';
            if (day.score > 0) {
              if (day.score <= 3) bgColor = '#fde047'; // Yellow
              else if (day.score <= 6) bgColor = '#fb923c'; // Orange
              else bgColor = '#ef4444'; // Red
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
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
    backgroundColor: '#f3f4f6',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  footer: {
    gap: 4,
  },
  peakText: {
    fontSize: 14,
    color: '#4b5563',
  },
  trendText: {
    fontSize: 14,
    color: '#4b5563',
  },
});
