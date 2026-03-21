import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { StorageService } from '../../src/services/storage';
import { WeeklyPatternsService } from '../../src/services/weeklyPatternsService';
import { WeeklyItem, WeeklyGeneration } from '../../src/models/types';
import { ArrowLeft, TrendingUp, Trophy, AlertTriangle, FlaskConical, Info, Sparkles } from 'lucide-react-native';
import { MICRO_DISCLAIMER_WEEKLY } from '../constants/legal';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';
import { TopBar } from '../components/TopBar';
import { auth } from '../../src/services/firebaseConfig';
import { getUserProfile, UserProfile } from '../../src/services/userProfile';

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
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }

            const response = await WeeklyPatternsService.getWeeklySummary();
            setGeneration(response.generation);
            setItems(response.items);

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
            case 'trend': return <TrendingUp size={20} color={Colors.primary} />;
            case 'win': return <Trophy size={20} color={Colors.success} />;
            case 'regression': return <AlertTriangle size={20} color={Colors.error} />;
            case 'experiment_update': return <FlaskConical size={20} color={Colors.experiment} />;
            default: return <Info size={20} color={Colors.outline} />;
        }
    };

    const renderItemCard = (item: WeeklyItem) => (
        <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    {getItemIcon(item.type)}
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.categoryLabel}>{item.category.replace('_', ' ').toUpperCase()}</Text>
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

    const chartWidth = Dimensions.get("window").width - 96;

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} />
            <TopBar userProfile={userProfile} />

            {loading && !generation ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Assembling your weekly patterns...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageLabel}>LONG-TERM PATTERNS</Text>
                        <Text style={styles.pageTitle}>Weekly Story</Text>
                    </View>

                    {generation && (
                        <View style={styles.heroSection}>
                            <Text style={styles.heroTitle}>{generation.summary.title}</Text>
                            <Text style={styles.heroSubtitle}>{generation.summary.subtitle}</Text>
                        </View>
                    )}

                    {moodChartData && (
                        <View style={styles.chartCard}>
                            <Text style={styles.chartLabel}>MOOD TREND</Text>
                            <LineChart
                                data={moodChartData}
                                width={chartWidth}
                                height={180}
                                chartConfig={{
                                    backgroundColor: Colors.surfaceLowest,
                                    backgroundGradientFrom: Colors.surfaceLowest,
                                    backgroundGradientTo: Colors.surfaceLowest,
                                    decimalPlaces: 1,
                                    color: (opacity = 1) => `rgba(79, 99, 89, ${opacity})`, // primary
                                    labelColor: (opacity = 1) => Colors.outline,
                                    style: { borderRadius: 16 },
                                    propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.primary }
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </View>
                    )}

                    {items.map(renderItemCard)}

                    {symptomChartData && (
                        <View style={styles.chartCard}>
                            <Text style={styles.chartLabel}>SYMPTOM LOAD</Text>
                            <LineChart
                                data={symptomChartData}
                                width={chartWidth}
                                height={180}
                                chartConfig={{
                                    backgroundColor: Colors.surfaceLowest,
                                    backgroundGradientFrom: Colors.surfaceLowest,
                                    backgroundGradientTo: Colors.surfaceLowest,
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(168, 56, 54, ${opacity})`, // error
                                    labelColor: (opacity = 1) => Colors.outline,
                                    style: { borderRadius: 16 },
                                    propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.error }
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        </View>
                    )}

                    {items.length === 0 && !loading && (
                        <View style={styles.emptyState}>
                            <Sparkles size={48} color={Colors.surfaceContainer} style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyText}>{message || "Not enough data for this week yet. Keep logging!"}</Text>
                        </View>
                    )}
                    <Text style={styles.disclaimerText}>{MICRO_DISCLAIMER_WEEKLY}</Text>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.s6,
        paddingTop: Spacing.s4,
        paddingBottom: 120,
    },
    pageHeader: {
        marginBottom: Spacing.s6,
    },
    pageLabel: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        marginBottom: 8,
    },
    pageTitle: {
        ...Typography.display,
        fontSize: 36,
        color: Colors.onSurface,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        ...Typography.body,
        marginTop: 16,
        color: Colors.outline,
    },
    heroSection: {
        marginBottom: Spacing.s6,
        backgroundColor: Colors.primaryMuted,
        padding: 24,
        borderRadius: Radii.xl,
    },
    heroTitle: {
        ...Typography.headline,
        fontSize: 24,
        color: Colors.primary,
        marginBottom: 8,
    },
    heroSubtitle: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurfaceVariant,
        lineHeight: 22,
    },
    chartCard: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.xl,
        padding: 24,
        marginBottom: Spacing.s6,
        alignItems: 'center',
        ...Shadows.ambient,
    },
    chartLabel: {
        ...Typography.label,
        alignSelf: 'flex-start',
        marginBottom: 16,
        color: Colors.outline,
    },
    card: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.xl,
        padding: 24,
        marginBottom: Spacing.s4,
        ...Shadows.ambient,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    categoryLabel: {
        ...Typography.label,
        fontSize: 10,
        color: Colors.outline,
        marginBottom: 4,
    },
    cardTitle: {
        ...Typography.title,
        fontSize: 18,
        color: Colors.onSurface,
    },
    cardDesc: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurfaceVariant,
        lineHeight: 22,
    },
    actionButton: {
        marginTop: 20,
        backgroundColor: Colors.primaryContainer,
        paddingVertical: 12,
        borderRadius: Radii.md,
        alignItems: 'center',
    },
    actionButtonText: {
        ...Typography.label,
        color: Colors.onPrimaryContainer,
        fontWeight: '700',
    },
    emptyState: {
        paddingVertical: 80,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        color: Colors.outline,
        textAlign: 'center',
    },
    disclaimerText: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.outline,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 16,
        marginTop: 24,
    },
});
