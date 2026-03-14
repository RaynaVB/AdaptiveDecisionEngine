import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Insight } from '../core/insight_engine/insightEngine';
import { SymptomEvent } from '../models/Symptom';
import { Sparkles, TrendingDown, Target } from 'lucide-react-native';

interface WeeklyReportProps {
    symptoms: SymptomEvent[];
    insights: Insight[];
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ symptoms, insights }) => {
    // Basic computation for presentation
    const symptomCounts: Record<string, number> = {};
    symptoms.forEach(s => symptomCounts[s.symptomType] = (symptomCounts[s.symptomType] || 0) + 1);
    
    const topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const predictionInsights = insights.filter(i => i.type === 'prediction');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Sparkles color="#6366f1" size={24} />
                <Text style={styles.title}>Weekly Intelligence</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Symptoms This Week</Text>
                {topSymptoms.length > 0 ? (
                    topSymptoms.map(([sym, count]) => (
                        <View key={sym} style={styles.row}>
                            <Text style={styles.rowText}>{sym}</Text>
                            <Text style={styles.badge}>{count} occurrences</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No symptoms logged this week.</Text>
                )}
            </View>

            {predictionInsights.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pattern Contributors</Text>
                    {predictionInsights.map(pi => (
                        <View key={pi.id} style={styles.insightBox}>
                            <Target color="#ef4444" size={16} />
                            <Text style={styles.insightText}>{pi.description}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={[styles.section, { borderBottomWidth: 0 }]}>
                <Text style={styles.sectionTitle}>Suggested Focus</Text>
                <View style={styles.insightBoxBlue}>
                    <TrendingDown color="#2563eb" size={16} />
                    <Text style={styles.insightTextBlue}>Consider checking the HealthLab for an adaptive experiment to target your active symptoms.</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginVertical: 16,
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#e0e7ff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#312e81',
        letterSpacing: -0.5,
    },
    section: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6b7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    rowText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        textTransform: 'capitalize',
    },
    badge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    insightBox: {
        flexDirection: 'row',
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 8,
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    insightText: {
        flex: 1,
        fontSize: 14,
        color: '#991b1b',
        lineHeight: 20,
    },
    insightBoxBlue: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 12,
        borderRadius: 8,
        alignItems: 'flex-start',
        gap: 8,
    },
    insightTextBlue: {
        flex: 1,
        fontSize: 14,
        color: '#1e40af',
        lineHeight: 20,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
        fontStyle: 'italic',
    }
});
