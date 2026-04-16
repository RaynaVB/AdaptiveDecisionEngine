import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Image, ActivityIndicator, Platform, UIManager, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { HealthLabService as HealthService } from '../../src/services/healthLabService';

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
            let currentEndDate = reset ? new Date() : (cursorDate || new Date());
            let mergedBatch: TimelineItem[] = [];
            let currentStartDate = new Date(currentEndDate);
            let currentBatchMoods: MoodEvent[] = [];
            let iterationCount = 0;
            const MAX_ITERATIONS = 10; // Search up to 30 days back in one go if empty

            while (mergedBatch.length === 0 && iterationCount < MAX_ITERATIONS) {
                currentStartDate = new Date(currentEndDate.getTime() - 3 * 24 * 60 * 60 * 1000);
                
                const [batchMeals, batchMoods, batchSymptoms] = await Promise.all([
                    StorageService.getMealEvents(undefined, currentStartDate.toISOString(), currentEndDate.toISOString()),
                    StorageService.getMoodEvents(undefined, currentStartDate.toISOString(), currentEndDate.toISOString()),
                    StorageService.getSymptomEvents(undefined, currentStartDate.toISOString(), currentEndDate.toISOString()),
                ]);

                mergedBatch = [
                    ...batchMeals.map(m => ({ type: 'meal' as const, data: m })),
                    ...batchMoods.map(m => ({ type: 'mood' as const, data: m })),
                    ...batchSymptoms.map(s => ({ type: 'symptom' as const, data: s }))
                ];

                if (mergedBatch.length === 0) {
                    currentEndDate = currentStartDate;
                    iterationCount++;
                } else {
                    currentBatchMoods = batchMoods;
                }
            }

            if (mergedBatch.length === 0) {
                // If we hit the max iterations and still found nothing, 
                // we'll stop looking further back for now.
                setHasMore(false);
                setLoading(false);
                return;
            }

            mergedBatch.sort((a, b) => new Date(b.data.occurredAt).getTime() - new Date(a.data.occurredAt).getTime());

            // Update mood cache for meal rendering
            if (reset) {
                setMoods(currentBatchMoods);
            } else {
                setMoods(prev => [...prev, ...currentBatchMoods]);
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

            setCursorDate(currentStartDate);

            // Robust hasMore check: if we found items but they are from a search that 
            // ended very far back, we might check if there's anything else. 
            // For now, if we found anything, we assume there might be more.
            const threeYearsAgo = new Date();
            threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
            if (currentStartDate < threeYearsAgo) {
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
            const experiments = await HealthService.getActiveExperiments();
            setActiveExperiments(experiments);
        } catch (e) {
            console.error('[LogsScreen] Failed to load experiments:', e);
        }
    };

    const handleDeleteItem = (item: TimelineItem) => {
        Alert.alert(
            "Delete Entry",
            `Are you sure you want to delete this ${item.type}? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            if (item.type === 'meal') {
                                await StorageService.deleteMealEvent(item.data.id);
                            } else if (item.type === 'mood') {
                                await StorageService.deleteMoodEvent(item.data.id);
                            } else if (item.type === 'symptom') {
                                await StorageService.deleteSymptomEvent(item.data.id);
                            }

                            // Optimistically update the UI
                            setSections(prev => {
                                return prev.map(section => ({
                                    ...section,
                                    data: section.data.filter(d => d.data.id !== item.data.id)
                                })).filter(section => section.data.length > 0);
                            });

                            if (item.type === 'mood') {
                                setMoods(prev => prev.filter(m => m.id !== item.data.id));
                            }
                        } catch (e) {
                            console.error('[LogsScreen] Failed to delete item:', e);
                            Alert.alert("Error", "Failed to delete item. Please try again.");
                        }
                    }
                }
            ]
        );
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

    const renderMealItem = (item: MealEvent, timeGap: string | null) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.timelineRow}>
                <View style={styles.leftColumn}>
                    <View style={styles.timelineLine} />
                    {timeGap && (
                        <View style={styles.timeGapNode}>
                            <Text style={styles.timeGapText}>{timeGap}</Text>
                        </View>
                    )}
                    <View style={styles.timelineNode} />
                </View>

                <TouchableOpacity
                    style={[styles.cardColumn, { marginTop: 4 }]}
                    onPress={() => navigation.getParent()?.navigate('MealDetail', { mealId: item.id })}
                    onLongPress={() => handleDeleteItem({ type: 'meal', data: item })}
                >
                    <View style={styles.mealHeader}>
                        <Text style={styles.timeColumnText}>{timeString}</Text>
                        <Text style={styles.mealSlotLabel}>
                             • {(item.mealSlot || 'meal').toUpperCase()}
                        </Text>
                    </View>

                    {item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={styles.mealImage} resizeMode="cover" />
                    ) : (
                        <Text style={styles.summaryText}>{formatMealSummary(item)}</Text>
                    )}
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

    const renderMoodItem = (item: MoodEvent, timeGap: string | null) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const emoji = getMoodEmoji(item.symptomType, item.severity ?? 0);
        const intensityStr = item.severity !== undefined ? `${item.severity > 0 ? '+' : ''}${item.severity}` : '';
        const typeLabel = item.moodLabel || (item.symptomType.charAt(0).toUpperCase() + item.symptomType.slice(1).replace(/_/g, ' '));

        return (
            <View style={styles.timelineRow}>
                <View style={styles.leftColumn}>
                    <View style={styles.timelineLine} />
                    {timeGap && (
                        <View style={styles.timeGapNode}>
                            <Text style={styles.timeGapText}>{timeGap}</Text>
                        </View>
                    )}
                    <View style={styles.timelineNodeSmall} />
                </View>

                <TouchableOpacity 
                    style={styles.compactRow}
                    activeOpacity={0.7}
                    onLongPress={() => handleDeleteItem({ type: 'mood', data: item })}
                >
                    <Text style={styles.compactTime}>{timeString}</Text>
                    <Text style={styles.compactEmoji}>{emoji}</Text>
                    <Text style={styles.compactLabel}>{typeLabel}</Text>
                    {intensityStr ? <Text style={styles.compactValue}>{intensityStr}</Text> : null}
                </TouchableOpacity>
            </View>
        );
    };

    const renderSymptomItem = (item: SymptomEvent, timeGap: string | null) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.timelineRow}>
                <View style={styles.leftColumn}>
                    <View style={styles.timelineLine} />
                    {timeGap && (
                        <View style={styles.timeGapNode}>
                            <Text style={styles.timeGapText}>{timeGap}</Text>
                        </View>
                    )}
                    <View style={[styles.timelineNodeSmall, { backgroundColor: Colors.error }]} />
                </View>

                <TouchableOpacity 
                    style={styles.compactRow}
                    activeOpacity={0.7}
                    onLongPress={() => handleDeleteItem({ type: 'symptom', data: item })}
                >
                    <Text style={styles.compactTime}>{timeString}</Text>
                    <Zap size={14} color={Colors.error} style={{ marginHorizontal: 8 }} fill={Colors.error} />
                    <Text style={styles.compactLabel}>
                        {(item.symptomType || 'symptom').charAt(0).toUpperCase() + (item.symptomType || 'symptom').slice(1)}
                    </Text>
                    <View style={styles.intensityBadgeSmall}>
                        <Text style={styles.intensityTextSmall}>{item.severity}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item, index, section }: { item: TimelineItem, index: number, section: TimelineSection }) => {
        let timeGap: string | null = null;
        if (index > 0) {
            const prevItem = section.data[index - 1];
            const currentTime = new Date(item.data.occurredAt).getTime();
            const prevTime = new Date(prevItem.data.occurredAt).getTime();
            const diffMs = Math.abs(prevTime - currentTime);
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins >= 1) {
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                timeGap = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}min` : ''}` : `${mins}min`;
            }
        }

        if (item.type === 'meal') return renderMealItem(item.data, timeGap);
        if (item.type === 'symptom') return renderSymptomItem(item.data, timeGap);
        return renderMoodItem(item.data, timeGap);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} edges={['top']} />
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
        backgroundColor: Colors.warning,
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
        backgroundColor: Colors.warning,
        opacity: 0.3,
    },
    timelineNode: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.warning,
        zIndex: 1,
        marginTop: 20,
    },
    timelineNodeSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.warning,
        zIndex: 1,
        marginTop: 14,
    },
    timeGapNode: {
        position: 'absolute',
        top: -15,
        backgroundColor: Colors.background,
        paddingVertical: 2,
        zIndex: 2,
    },
    timeGapText: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.onSurfaceVariant,
        opacity: 0.8,
        fontWeight: '800',
    },
    cardColumn: {
        flex: 1,
        paddingBottom: Spacing.s4,
    },
    card: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.xl,
        padding: Spacing.s3,
        ...Shadows.ambient,
        marginTop: 4,
    },
    mealHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    mealSlotLabel: {
        ...Typography.label,
        fontSize: 10,
        color: Colors.outline,
    },
    summaryText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.onSurface,
        fontSize: 18,
        marginBottom: 4,
    },
    timeColumnText: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
        fontSize: 12,
        fontWeight: '700',
    },
    description: {
        ...Typography.body,
        color: Colors.onSurfaceVariant,
        fontSize: 14,
        marginTop: 4,
    },
    mealImage: {
        width: '100%',
        height: 180,
        borderRadius: Radii.lg,
        marginBottom: Spacing.s2,
    },
    mealIconPlaceholder: {
        width: '100%',
        height: 80,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: Radii.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.s2,
    },
    compactRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingBottom: 20,
    },
    compactTime: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.onSurfaceVariant,
        width: 65,
    },
    compactEmoji: {
        fontSize: 16,
        marginHorizontal: 8,
    },
    compactLabel: {
        ...Typography.body,
        fontSize: 15,
        fontWeight: '500',
        color: Colors.onSurface,
        flex: 1,
    },
    compactValue: {
        ...Typography.label,
        fontSize: 12,
        fontWeight: '800',
        color: Colors.primary,
        backgroundColor: Colors.primarySubtle,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radii.md,
    },
    intensityBadgeSmall: {
        backgroundColor: Colors.errorContainer,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    intensityTextSmall: {
        ...Typography.label,
        color: Colors.error,
        fontSize: 10,
        fontWeight: '800',
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
