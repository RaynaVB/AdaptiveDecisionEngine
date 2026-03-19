import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { StorageService } from '../../src/services/storage';
import { MealEvent, MoodEvent, Pattern } from '../../src/models/types';
import { SymptomEvent } from '../../src/models/Symptom';
import { ArrowLeft } from 'lucide-react-native';

type WeeklyPatternsScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'WeeklyPatterns'>;
};

export default function WeeklyPatternsScreen({ navigation }: WeeklyPatternsScreenProps) {
    const [loading, setLoading] = useState(true);
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [message, setMessage] = useState('');
    const [chartData, setChartData] = useState<{ labels: string[], datasets: [{ data: number[] }] } | null>(null);
    const [symptomChartData, setSymptomChartData] = useState<{ labels: string[], datasets: [{ data: number[] }] } | null>(null);

    useEffect(() => {
        loadPatterns();
    }, []);

    const loadPatterns = async () => {
        try {
            setLoading(true);
            const meals = await StorageService.getMealEvents();
            const moods = await StorageService.getMoodEvents();
            const symptoms = await StorageService.getSymptomEvents();

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentMeals = meals.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
            const recentMoods = moods.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
            const recentSymptoms = symptoms.filter(s => new Date(s.occurredAt) >= sevenDaysAgo);

            // Allow screens to show with symptom data even if mood data is sparse
            const hasEnoughMeals = recentMeals.length >= 5;
            const hasEnoughMoods = recentMoods.length >= 3;
            const hasEnoughSymptoms = recentSymptoms.length >= 2;

            if (!hasEnoughMeals && !hasEnoughSymptoms) {
                setMessage("Not enough data yet. Log at least 5 meals or 2 symptoms this week to see patterns.");
                setPatterns([]);
                setLoading(false);
                return;
            }

            // Compute Mood Chart Data
            if (hasEnoughMoods) {
                const moodByDay: Record<string, { sum: number, count: number }> = {};
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dayStr = d.toLocaleDateString([], { weekday: 'short' });
                    moodByDay[dayStr] = { sum: 0, count: 0 };
                }

                recentMoods.forEach(m => {
                    const d = new Date(m.occurredAt);
                    const dayStr = d.toLocaleDateString([], { weekday: 'short' });
                    if (moodByDay[dayStr]) {
                        const val = typeof m.valence === 'number' ? m.valence : 3;
                        moodByDay[dayStr].sum += val;
                        moodByDay[dayStr].count += 1;
                    }
                });

                const labels: string[] = [];
                const data: number[] = [];
                Object.entries(moodByDay).forEach(([day, stats]) => {
                    labels.push(day);
                    data.push(stats.count > 0 ? stats.sum / stats.count : 3);
                });

                setChartData({ labels, datasets: [{ data }] });
            } else {
                setChartData(null);
            }

            // Compute Symptom Trend Chart
            if (hasEnoughSymptoms) {
                const symptomByDay: Record<string, number> = {};
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dayStr = d.toLocaleDateString([], { weekday: 'short' });
                    symptomByDay[dayStr] = 0;
                }

                recentSymptoms.forEach(s => {
                    const d = new Date(s.occurredAt);
                    const dayStr = d.toLocaleDateString([], { weekday: 'short' });
                    if (symptomByDay[dayStr] !== undefined) {
                        symptomByDay[dayStr] += s.severity;
                    }
                });

                const sLabels: string[] = [];
                const sData: number[] = [];
                Object.entries(symptomByDay).forEach(([day, total]) => {
                    sLabels.push(day);
                    sData.push(total);
                });

                const hasData = sData.some(v => v > 0);
                if (hasData) {
                    setSymptomChartData({ labels: sLabels, datasets: [{ data: sData }] });
                } else {
                    setSymptomChartData(null);
                }
            } else {
                setSymptomChartData(null);
            }

            // Patterns are now server-side (using placeholder for now)
            const results: Pattern[] = [];

            setPatterns(results);
            setMessage(results.length === 0 ? "No patterns detected yet. Keep logging!" : "");

        } catch (e) {
            console.error(e);
            setMessage("Failed to load patterns.");
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceColor = (c: string) => {
        switch (c) {
            case 'high': return '#059669';
            case 'medium': return '#d97706';
            default: return '#6b7280';
        }
    };

    const getConfidenceBadge = (c: string) => {
        return (
            <View style={[styles.badge, { backgroundColor: getConfidenceColor(c) + '20' }]}>
                <Text style={[styles.badgeText, { color: getConfidenceColor(c) }]}>
                    {c.toUpperCase()} CONFIDENCE
                </Text>
            </View>
        );
    };

    const getSegmentationText = (seg?: Pattern['segmentation']) => {
        if (!seg) return null;
        const parts = [];
        if (seg.dayType && seg.dayType !== 'mixed') {
            parts.push(seg.dayType === 'weekday' ? 'Weekdays' : 'Weekends');
        }
        if (seg.timeOfDay && seg.timeOfDay !== 'mixed') {
            parts.push(seg.timeOfDay.replace('_', ' '));
        }
        if (parts.length === 0) return null;
        return `Mostly: ${parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`;
    };

    const renderPatternCard = (pattern: Pattern) => (
        <View key={pattern.id} style={styles.card}>
            <View style={styles.cardHeader}>
                {getConfidenceBadge(pattern.confidence)}
            </View>
            <Text style={styles.cardTitle}>{pattern.title}</Text>
            <Text style={styles.cardDesc}>{pattern.description}</Text>

            {getSegmentationText(pattern.segmentation) && (
                <Text style={styles.segmentation}>
                    {getSegmentationText(pattern.segmentation)}
                </Text>
            )}

            {pattern.actionableInsight && pattern.actionableInsight.actionType === 'start_experiment' && (
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ExperimentDetail', { experimentId: pattern.actionableInsight?.experimentIdToStart || '' })}
                >
                    <Text style={styles.actionButtonText}>{pattern.actionableInsight.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const chartWidth = Dimensions.get("window").width - 64;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Weekly Patterns</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {(patterns.length > 0 || chartData || symptomChartData) ? (
                        <>
                            {chartData && (
                                <View style={styles.chartCard}>
                                    <Text style={styles.chartTitle}>Mood Trend (7 Days)</Text>
                                    <LineChart
                                        data={chartData}
                                        width={chartWidth}
                                        height={180}
                                        yAxisLabel=""
                                        yAxisSuffix=""
                                        chartConfig={{
                                            backgroundColor: "#ffffff",
                                            backgroundGradientFrom: "#ffffff",
                                            backgroundGradientTo: "#ffffff",
                                            decimalPlaces: 1,
                                            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                                            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                            style: { borderRadius: 16 },
                                            propsForDots: { r: "4", strokeWidth: "2", stroke: "#2563eb" }
                                        }}
                                        bezier
                                        style={{ marginVertical: 8, borderRadius: 16 }}
                                    />
                                </View>
                            )}

                            {symptomChartData && (
                                <View style={styles.chartCard}>
                                    <Text style={styles.chartTitle}>Symptom Load (7 Days)</Text>
                                    <Text style={styles.chartSubtitle}>Daily total severity score</Text>
                                    <LineChart
                                        data={symptomChartData}
                                        width={chartWidth}
                                        height={180}
                                        yAxisLabel=""
                                        yAxisSuffix=""
                                        chartConfig={{
                                            backgroundColor: "#ffffff",
                                            backgroundGradientFrom: "#ffffff",
                                            backgroundGradientTo: "#ffffff",
                                            decimalPlaces: 0,
                                            color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                                            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                            style: { borderRadius: 16 },
                                            propsForDots: { r: "4", strokeWidth: "2", stroke: "#ef4444" }
                                        }}
                                        bezier
                                        style={{ marginVertical: 8, borderRadius: 16 }}
                                    />
                                </View>
                            )}

                            {patterns.map(renderPatternCard)}
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>{message}</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    backButton: { marginRight: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16 },
    chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, alignItems: 'center', elevation: 2 },
    chartTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4, alignSelf: 'flex-start' },
    chartSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 8, alignSelf: 'flex-start' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    cardHeader: { flexDirection: 'row', marginBottom: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
    cardDesc: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 },
    segmentation: { fontSize: 13, color: '#4b5563', fontWeight: '500', marginTop: 8, fontStyle: 'italic' },
    actionButton: { marginTop: 16, backgroundColor: '#f0fdf4', borderColor: '#22c55e', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
    actionButtonText: { color: '#15803d', fontWeight: '600', fontSize: 14 },
    emptyState: { padding: 32, alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 },
});
