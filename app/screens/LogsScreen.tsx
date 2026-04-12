import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Image, ActivityIndicator, Platform, UIManager, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { SymptomEvent } from '../../src/models/Symptom';
import { ExperimentRun } from '../../src/models/healthlab';
import { StorageService } from '../../src/services/storage';
import { Utensils, Zap, Smile, CheckCircle2, ScrollText } from 'lucide-react-native';
import { formatMealSummary } from '../../src/utils/mealSummary';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';
import { TopBar } from '../components/TopBar';
import { SmartFAB } from '../components/home/SmartFAB';
import { HealthLabService } from '../../src/services/healthLabService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type LogsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

export default function LogsScreen() {
    const navigation = useNavigation<LogsScreenNavigationProp>();

    type TimelineItem = { type: 'meal', data: MealEvent } | { type: 'mood', data: MoodEvent } | { type: 'symptom', data: SymptomEvent };
    type TimelineSection = { title: string, data: TimelineItem[] };

    const [sections, setSections] = useState<TimelineSection[]>([]);
    const [moods, setMoods] = useState<MoodEvent[]>([]); // To help with meal coloring/linking
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [cursorDate, setCursorDate] = useState<Date | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [activeExperiments, setActiveExperiments] = useState<ExperimentRun[]>([]);

    const fetchBatch = async (reset: boolean = false) => {
        if (loading || (!reset && !hasMore)) return;

        setLoading(true);
        try {
            const endDate = reset ? new Date() : (cursorDate || new Date());
            // Fetch in 3-day blocks as requested
            const startDate = new Date(endDate.getTime() - 3 * 24 * 60 * 60 * 1000);

            const [batchMeals, batchMoods, batchSymptoms] = await Promise.all([
                StorageService.getMealEvents(undefined, startDate.toISOString(), endDate.toISOString()),
                StorageService.getMoodEvents(undefined, startDate.toISOString(), endDate.toISOString()),
                StorageService.getSymptomEvents(undefined, startDate.toISOString(), endDate.toISOString()),
            ]);

            const mergedBatch: TimelineItem[] = [
                ...batchMeals.map(m => ({ type: 'meal' as const, data: m })),
                ...batchMoods.map(m => ({ type: 'mood' as const, data: m })),
                ...batchSymptoms.map(s => ({ type: 'symptom' as const, data: s }))
            ];

            // If we found basically nothing, and we aren't "too far" back, try to fetch the next 3 days immediately
            // to avoid an empty scroll experience. We'll limit this to 3 recursive jumps for safety.
            if (mergedBatch.length === 0 && !reset) {
                // Check if we should keep looking back (avoiding infinite loops if user has no data)
                // We'll let the user manually trigger the next fetch by scrolling or we could automate one jump.
            }

            mergedBatch.sort((a, b) => new Date(b.data.occurredAt).getTime() - new Date(a.data.occurredAt).getTime());

            // Update mood cache for meal rendering
            if (reset) {
                setMoods(batchMoods);
            } else {
                setMoods(prev => [...prev, ...batchMoods]);
            }

            const grouped: { [key: string]: TimelineItem[] } = {};
            mergedBatch.forEach(item => {
                const d = new Date(item.data.occurredAt);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                let dayTitle = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

                if (d.toDateString() === today.toDateString()) {
                    dayTitle = 'Today';
                } else if (d.toDateString() === yesterday.toDateString()) {
                    dayTitle = 'Yesterday';
                }

                if (!grouped[dayTitle]) {
                    grouped[dayTitle] = [];
                }
                grouped[dayTitle].push(item);
            });

            const newSections: TimelineSection[] = Object.keys(grouped).map(key => ({
                title: key,
                data: grouped[key]
            }));

            if (reset) {
                setSections(newSections);
            } else {
                // Merge sections carefully if they share titles
                setSections(prev => {
                    const result = [...prev];
                    newSections.forEach(newSec => {
                        const existing = result.find(s => s.title === newSec.title);
                        if (existing) {
                            existing.data = [...existing.data, ...newSec.data].sort((a, b) =>
                                new Date(b.data.occurredAt).getTime() - new Date(a.data.occurredAt).getTime()
                            ).filter((v, i, a) => a.findIndex(t => t.data.id === v.data.id) === i);
                        } else {
                            result.push(newSec);
                        }
                    });
                    return result.sort((a, b) => {
                        // Extract first item date for section sorting
                        const dateA = new Date(a.data[0].data.occurredAt);
                        const dateB = new Date(b.data[0].data.occurredAt);
                        return dateB.getTime() - dateA.getTime();
                    });
                });
            }

            setCursorDate(startDate);

            // Heuristic for "hasMore": if we fetched 0 items and we are more than 30 days back, stop.
            // Or just keep allowing it until a hard stop.
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 365); // Let's go back up to a year
            if (startDate < thirtyDaysAgo && mergedBatch.length === 0) {
                setHasMore(false);
            }

        } catch (e) {
            console.error('[LogsScreen] Failed to fetch logs:', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setHasMore(true);
        await fetchBatch(true);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchBatch(true);
        loadActiveExperiments();
    }, []);

    const loadActiveExperiments = async () => {
        try {
            const experiments = await HealthLabService.getActiveExperiments();
            setActiveExperiments(experiments);
        } catch (e) {
            console.error('[LogsScreen] Failed to load experiments:', e);
        }
    };

    const getMoodForMeal = (meal: MealEvent) => {
        const linkedMood = moods.find(m => m.linkedMealEventId === meal.id);
        if (linkedMood) return linkedMood;

        const mealTime = new Date(meal.occurredAt).getTime();
        const validMoods = moods.filter(m => {
            const moodTime = new Date(m.occurredAt).getTime();
            return moodTime <= mealTime && (mealTime - moodTime) <= 6 * 60 * 60 * 1000;
        });

        validMoods.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        return validMoods.length > 0 ? validMoods[0] : null;
    };

    const renderMealItem = (item: MealEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.timelineRow}>
                <View style={styles.leftColumn}>
                    <View style={styles.timelineLine} />
                    <View style={[styles.iconCircle, { backgroundColor: Colors.mealContainer }]}>
                        <Utensils size={16} color={Colors.mealIcon} />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.card, styles.cardColumn]}
                    onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
                >
                    {item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={styles.mealImage} resizeMode="cover" />
                    ) : null}

                    <View style={{ paddingHorizontal: 4 }}>
                        <Text style={[styles.summaryText, { fontSize: 18, marginBottom: 4 }]}>{formatMealSummary(item)}</Text>
                        <Text style={styles.timeColumnText}>
                            {timeString} • {(item.mealSlot || 'meal').charAt(0).toUpperCase() + (item.mealSlot || 'meal').slice(1)}
                        </Text>

                        {item.textDescription ? (
                            <Text style={[styles.description, { marginTop: 8 }]} numberOfLines={2}>{item.textDescription}</Text>
                        ) : null}

                        <View style={styles.checkmarkContainer}>
                            <CheckCircle2 size={20} color={Colors.primary} />
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const getMoodEmoji = (type: string, severity: number): string => {
        if (severity > 0) {
            if (type === 'energy') return '⚡';
            if (type === 'sleep quality') return '🌙';
            if (type === 'focus') return '🎯';
            if (type === 'stress') return '😤';
            return '😊';
        }
        if (severity < 0) {
            if (type === 'energy') return '😴';
            if (type === 'stress') return '😣';
            if (type === 'sleep quality') return '😔';
            if (type === 'focus') return '😵';
            return '😟';
        }
        return '😐';
    };

    const renderMoodItem = (item: MoodEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const emoji = getMoodEmoji(item.symptomType, item.severity ?? 0);
        const intensityStr = item.severity !== undefined ? `${item.severity > 0 ? '+' : ''}${item.severity}` : '';
        const typeLabel = item.moodLabel || (item.symptomType.charAt(0).toUpperCase() + item.symptomType.slice(1).replace(/_/g, ' '));

        return (
            <View style={styles.timelineRow}>
                <View style={styles.leftColumn}>
                    <View style={styles.timelineLine} />
                    <View style={[styles.iconCircle, { backgroundColor: Colors.moodContainer }]}>
                        <Smile size={18} color={Colors.moodIcon} />
                    </View>
                </View>

                <View style={[styles.card, styles.cardColumn, { flexDirection: 'row', alignItems: 'center', padding: Spacing.s4 }]}>
                    <Text style={{ fontSize: 32, marginRight: Spacing.s4 }}>{emoji}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.summaryText, { fontSize: 17, marginBottom: 2 }]}>{typeLabel}</Text>
                        <Text style={styles.timeColumnText}>
                            {timeString}{intensityStr ? ` • ${intensityStr}` : ''}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderSymptomItem = (item: SymptomEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.timelineRow}>
                <View style={styles.leftColumn}>
                    <View style={styles.timelineLine} />
                    <View style={[styles.iconCircle, { backgroundColor: Colors.errorContainer }]}>
                        <Zap size={16} color={Colors.error} fill={Colors.error} />
                    </View>
                </View>

                <View style={[styles.card, styles.cardColumn, { padding: Spacing.s4 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text style={[styles.summaryText, { fontSize: 18, flex: 1, marginRight: 8 }]}>
                            {(item.symptomType || 'symptom').charAt(0).toUpperCase() + (item.symptomType || 'symptom').slice(1)}
                        </Text>
                        <View style={styles.intensityBadge}>
                            <Text style={styles.intensityText}>Intensity {item.severity}</Text>
                        </View>
                    </View>
                    <Text style={styles.timeColumnText}>
                        {timeString} {item.durationMinutes ? `• ${item.durationMinutes}m duration` : ''}
                    </Text>
                    {item.notes ? (
                        <Text style={[styles.description, { marginTop: 8 }]} numberOfLines={2}>{item.notes}</Text>
                    ) : null}
                </View>
            </View>
        );
    };

    const renderItem = ({ item }: { item: TimelineItem }) => {
        if (item.type === 'meal') return renderMealItem(item.data);
        if (item.type === 'symptom') return renderSymptomItem(item.data);
        return renderMoodItem(item.data);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} />
            <TopBar hideProfile />

            <SectionList
                sections={sections}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{title}</Text>
                        <View style={styles.sectionDivider} />
                    </View>
                )}
                keyExtractor={item => `${item.type}-${item.data.id}`}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                onEndReached={() => fetchBatch()}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={
                    <View style={styles.pageHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <ScrollText size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.headerLabel}>History</Text>
                        </View>
                        <Text style={styles.pageTitle}>Your Log</Text>
                    </View>
                }
                ListFooterComponent={
                    loading ? (
                        <View style={{ padding: Spacing.s6 }}>
                            <ActivityIndicator color={Colors.primary} />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateTitle}>No history yet</Text>
                            <Text style={styles.emptyStateBody}>
                                Start logging your meals and symptoms to build your health history.
                            </Text>
                        </View>
                    ) : null
                }
            />

            <SmartFAB 
                hasActiveExperiment={activeExperiments.length > 0}
                onLogMeal={() => navigation.navigate('LogMeal')}
                onLogSymptom={() => navigation.navigate('SymptomLogger')}
                onLogMood={() => navigation.navigate('MoodLogger')}
                onLogProgress={() => navigation.navigate('SymptomLogger')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    pageHeader: {
        paddingHorizontal: Spacing.s4,
        paddingTop: Spacing.s4,
        paddingBottom: Spacing.s2,
    },
    headerLabel: {
        ...Typography.label,
        color: Colors.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    pageTitle: {
        ...Typography.display,
        fontSize: 34,
        color: Colors.onSurface,
        marginBottom: 8,
    },
    subtitle: {
        ...Typography.body,
        color: Colors.onSurfaceVariant,
        fontSize: 15,
    },
    sectionHeader: {
        paddingHorizontal: Spacing.s4,
        paddingTop: Spacing.s4,
        paddingBottom: Spacing.s2,
        backgroundColor: Colors.background,
    },
    sectionHeaderText: {
        ...Typography.title,
        color: Colors.onSurface,
    },
    sectionDivider: {
        height: 2,
        backgroundColor: Colors.primary,
        marginTop: Spacing.s1,
        width: 32,
        marginBottom: Spacing.s3,
        borderRadius: 1,
    },
    listContent: {
        paddingBottom: 100,
    },
    timelineRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.s4,
        marginBottom: Spacing.s3,
    },
    leftColumn: {
        width: 44,
        alignItems: 'center',
        marginRight: Spacing.s3,
    },
    timelineLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: Colors.surfaceContainer,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        marginTop: 4,
    },
    cardColumn: {
        flex: 1,
    },
    card: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.xl,
        padding: Spacing.s3,
        ...Shadows.ambient,
    },
    summaryText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.onSurface,
        marginBottom: 4,
    },
    timeColumnText: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
        fontSize: 12,
    },
    description: {
        ...Typography.body,
        color: Colors.onSurfaceVariant,
        fontSize: 14,
    },
    mealImage: {
        width: '100%',
        height: 180,
        borderRadius: Radii.lg,
        marginBottom: Spacing.s3,
    },
    intensityBadge: {
        backgroundColor: Colors.errorContainer,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radii.md,
    },
    intensityText: {
        ...Typography.label,
        color: Colors.error,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    checkmarkContainer: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    emptyState: {
        padding: Spacing.s8,
        alignItems: 'center',
    },
    emptyStateTitle: {
        ...Typography.title,
        color: Colors.onSurfaceVariant,
        marginBottom: 8,
    },
    emptyStateBody: {
        ...Typography.body,
        color: Colors.outline,
        textAlign: 'center',
    },
});
