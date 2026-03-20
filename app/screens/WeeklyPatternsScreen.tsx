import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { StorageService } from '../../src/services/storage';
import { WeeklyPatternsService } from '../../src/services/weeklyPatternsService';
import { WeeklyItem, WeeklyGeneration } from '../../src/models/types';
import { ArrowLeft, TrendingUp, Trophy, AlertTriangle, FlaskConical, Info } from 'lucide-react-native';
import { MICRO_DISCLAIMER_WEEKLY } from '../constants/legal';

type WeeklyPatternsScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'WeeklyPatterns'>;
};

export default function WeeklyPatternsScreen({ navigation }: WeeklyPatternsScreenProps) {
    const [loading, setLoading] = useState(true);
    const [generation, setGeneration] = useState<WeeklyGeneration | null>(null);
    const [items, setItems] = useState<WeeklyItem[]>([]);
    const [message, setMessage] = useState('');
    const [moodChartData, setMoodChartData] = useState<{ labels: string[], datasets: [{ data: number[] }] } | null>(null);
    const [symptomChartData, setSymptomChartData] = useState<{ labels: string[], datasets: [{ data: number[] }] } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch from Service
            const response = await WeeklyPatternsService.getWeeklySummary();
            setGeneration(response.generation);
            setItems(response.items);

            // 2. Fetch local data for charts (fallback for now, or use as primary visual)
            // Backend currently doesn't provide full chart data arrays, just summaries.
            const moods = await StorageService.getMoodEvents();
            const symptoms = await StorageService.getSymptomEvents();

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentMoods = moods.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
            const recentSymptoms = symptoms.filter(s => new Date(s.occurredAt) >= sevenDaysAgo);

            if (recentMoods.length >= 3) {
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
                        const val = typeof m.valence === 'number' ? m.valence : (m.valence === 'positive' ? 5 : m.valence === 'negative' ? 1 : 3);
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
                setMoodChartData({ labels, datasets: [{ data }] });
            } else {
                setMoodChartData(null);
            }

            if (recentSymptoms.length >= 2) {
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
                if (sData.some(v => v > 0)) {
                    setSymptomChartData({ labels: sLabels, datasets: [{ data: sData }] });
                } else {
                    setSymptomChartData(null);
                }
            } else {
                setSymptomChartData(null);
            }

        } catch (e) {
            console.error(e);
            setMessage("Failed to load your weekly story.");
        } finally {
            setLoading(false);
        }
    };

    const getItemIcon = (type: WeeklyItem['type']) => {
        switch (type) {
            case 'trend': return <TrendingUp size={20} color="#2563eb" />;
            case 'win': return <Trophy size={20} color="#059669" />;
            case 'regression': return <AlertTriangle size={20} color="#dc2626" />;
            case 'experiment_update': return <FlaskConical size={20} color="#7c3aed" />;
            case 'pattern': return <Info size={20} color="#2563eb" />;
            default: return <Info size={20} color="#6b7280" />;
        }
    };

    const renderItemCard = (item: WeeklyItem) => (
        <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    {getItemIcon(item.type)}
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
            </View>
            <Text style={styles.cardDesc}>{item.summary}</Text>
            
            {item.type === 'experiment_update' && item.metadata?.experimentId && (
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.metadata?.experimentId })}
                >
                    <Text style={styles.actionButtonText}>View Experiment</Text>
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
                <Text style={styles.title}>Weekly Story</Text>
                <TouchableOpacity onPress={() => loadData()} style={styles.refreshButton}>
                   <ActivityIndicator animating={loading} size="small" color="#2563eb" />
                </TouchableOpacity>
            </View>

            {loading && !generation ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Assembling your weekly patterns...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {generation && (
                        <View style={styles.heroSection}>
                            <Text style={styles.heroTitle}>{generation.summary.title}</Text>
                            <Text style={styles.heroSubtitle}>{generation.summary.subtitle}</Text>
                        </View>
                    )}

                    {moodChartData && (
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>Mood Trend (7 Days)</Text>
                            <LineChart
                                data={moodChartData}
                                width={chartWidth}
                                height={180}
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

                    {items.map(renderItemCard)}

                    {symptomChartData && (
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>Symptom Load (7 Days)</Text>
                            <LineChart
                                data={symptomChartData}
                                width={chartWidth}
                                height={180}
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

                    {items.length === 0 && !loading && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>{message || "Not enough data for this week yet. Keep logging!"}</Text>
                        </View>
                    )}
                    <Text style={styles.disclaimerText}>{MICRO_DISCLAIMER_WEEKLY}</Text>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    backButton: { padding: 4 },
    refreshButton: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    loadingText: { marginTop: 16, fontSize: 14, color: '#6b7280' },
    content: { padding: 16 },
    heroSection: { marginBottom: 24 },
    heroTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
    heroSubtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22 },
    chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', borderColor: '#f3f4f6', borderWidth: 1 },
    chartTitle: { fontSize: 15, fontWeight: '600', color: '#374151', alignSelf: 'flex-start', marginBottom: 8 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderColor: '#f3f4f6', borderWidth: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerText: { flex: 1 },
    categoryText: { fontSize: 11, fontWeight: '700', color: '#9ca3af', marginBottom: 2 },
    cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
    cardDesc: { fontSize: 15, color: '#4b5563', lineHeight: 22 },
    actionButton: { marginTop: 16, backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', borderWidth: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    actionButtonText: { color: '#6d28d9', fontWeight: '700', fontSize: 14 },
    emptyState: { padding: 48, alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#9ca3af', textAlign: 'center', lineHeight: 24 },
    disclaimerText: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 24,
        paddingHorizontal: 16,
        lineHeight: 18,
    },
});
