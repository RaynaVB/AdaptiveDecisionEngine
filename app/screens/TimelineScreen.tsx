import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { Plus, ChevronRight, X } from 'lucide-react-native';
import { formatMealSummary } from '../../src/utils/mealSummary';

type TimelineScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Timeline'>;

export default function TimelineScreen() {
    const navigation = useNavigation<TimelineScreenNavigationProp>();
    // Union Type for List
    type TimelineItem = { type: 'meal', data: MealEvent } | { type: 'mood', data: MoodEvent };

    const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
    const [meals, setMeals] = useState<MealEvent[]>([]);
    const [moods, setMoods] = useState<MoodEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const loadedMeals = await StorageService.getMealEvents();
        const loadedMoods = await StorageService.getMoodEvents();

        // Strict requirement: Timeline shows last 7 days of items
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const filteredMeals = loadedMeals.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
        const filteredMoods = loadedMoods.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);

        setMeals(filteredMeals);
        setMoods(loadedMoods); // Keep full mood list for context lookup

        // Merge and Sort
        const merged: TimelineItem[] = [
            ...filteredMeals.map(m => ({ type: 'meal' as const, data: m })),
            ...filteredMoods.map(m => ({ type: 'mood' as const, data: m }))
        ];

        merged.sort((a, b) => new Date(b.data.occurredAt).getTime() - new Date(a.data.occurredAt).getTime());

        setTimelineData(merged);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleClear = async () => {
        Alert.alert('Confirm', 'Delete all logs?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await StorageService.clearAllLogs();
                    await loadData();
                }
            }
        ]);
    };

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 16 }}>
                    <TouchableOpacity onPress={() => navigation.navigate('WeeklyPatterns')}>
                        <Text style={{ color: '#2563eb', fontWeight: '600' }}>Patterns</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClear}>
                        <Text style={{ color: '#ef4444' }}>Clear</Text>
                    </TouchableOpacity>
                </View>
            ),
        });
    }, [navigation]);

    const handleSeed = async () => {
        setLoading(true);
        await StorageService.seedDemoLogs();
        await loadData();
        Alert.alert('Success', 'Demo logs seeded!');
    };

    const getMoodForMeal = (meal: MealEvent) => {
        // 1. Check for directly linked mood
        const linkedMood = moods.find(m => m.linkedMealEventId === meal.id);
        if (linkedMood) return linkedMood;

        // 2. Fallback: Time Window (< 6 hours before)
        const mealTime = new Date(meal.occurredAt).getTime();
        const validMoods = moods.filter(m => {
            const moodTime = new Date(m.occurredAt).getTime();
            return moodTime <= mealTime && (mealTime - moodTime) <= 6 * 60 * 60 * 1000;
        });

        // Sort descending by time
        validMoods.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

        return validMoods.length > 0 ? validMoods[0] : null;
    };

    const renderMealItem = (item: MealEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dayString = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

        const mood = getMoodForMeal(item);
        const moodText = mood ? `${mood.valence} / ${mood.stress}${mood.tag ? ` (${mood.tag})` : ''}` : '—';
        const moodColor = mood?.valence === 'negative' ? '#fee2e2' : mood?.valence === 'positive' ? '#dcfce7' : '#f3f4f6';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.time}>{dayString} • {timeString}</Text>
                </View>

                <Text style={styles.summaryText}>{formatMealSummary(item)}</Text>

                {item.textDescription ? (
                    <Text style={styles.description} numberOfLines={1}>{item.textDescription}</Text>
                ) : null}

                <View style={[styles.moodContainer, { backgroundColor: moodColor }]}>
                    <Text style={styles.moodLabel}>Mood context:</Text>
                    <Text style={styles.moodValue}>{moodText}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderMoodItem = (item: MoodEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dayString = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

        // Mood Color Logic
        const moodColor = item.valence === 'negative' ? '#fee2e2' : item.valence === 'positive' ? '#dcfce7' : '#f3f4f6';
        const borderColor = item.valence === 'negative' ? '#fca5a5' : item.valence === 'positive' ? '#86efac' : '#e5e7eb';

        return (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: borderColor }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.time}>{dayString} • {timeString}</Text>
                    <View style={[styles.slotBadge, { backgroundColor: moodColor }]}>
                        <Text style={[styles.slotText, { color: '#374151' }]}>Mood Check-in</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 24, marginRight: 8 }}>
                        {item.valence === 'positive' ? '🙂' : item.valence === 'negative' ? '🙁' : '😐'}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
                        {item.valence} • {item.energy} Energy
                    </Text>
                </View>

                {item.tag && (
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{item.tag}</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderItem = ({ item }: { item: TimelineItem }) => {
        if (item.type === 'meal') return renderMealItem(item.data);
        return renderMoodItem(item.data);
    };

    return (
        <View style={styles.container}>
            {timelineData.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No logs found.</Text>
                    <TouchableOpacity style={styles.seedButton} onPress={handleSeed}>
                        <Text style={styles.seedButtonText}>Seed Demo Logs</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={timelineData}
                    renderItem={renderItem}
                    keyExtractor={item => item.data.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                    ListHeaderComponent={
                        <View style={{ paddingBottom: 16 }}>
                            <Text style={styles.subtitle}>Showing last 7 days</Text>
                        </View>
                    }
                />
            )}

            {/* Speed Dial FAB */}
            {isFabOpen && (
                <>
                    {/* Backdrop to close */}
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setIsFabOpen(false)}
                    />

                    <View style={styles.speedDialContainer}>
                        <TouchableOpacity
                            style={styles.subFab}
                            onPress={() => {
                                setIsFabOpen(false);
                                navigation.navigate('LogMood');
                            }}
                        >
                            <Text style={styles.subFabLabel}>Log Mood</Text>
                            <View style={[styles.subFabIcon, { backgroundColor: '#8b5cf6' }]}>
                                <Text style={{ fontSize: 24 }}>😊</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.subFab}
                            onPress={() => {
                                setIsFabOpen(false);
                                navigation.navigate('LogMeal');
                            }}
                        >
                            <Text style={styles.subFabLabel}>Log Meal</Text>
                            <View style={[styles.subFabIcon, { backgroundColor: '#2563eb' }]}>
                                <Text style={{ fontSize: 24 }}>🍽️</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            <TouchableOpacity
                style={[styles.fab, isFabOpen ? { backgroundColor: '#4b5563' } : {}]}
                onPress={() => setIsFabOpen(!isFabOpen)}
            >
                {isFabOpen ? <X color="#fff" size={32} /> : <Plus color="#fff" size={32} />}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    time: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    slotBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    slotText: {
        fontSize: 12,
        color: '#1d4ed8',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    tag: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        fontSize: 12,
        color: '#374151',
        textTransform: 'capitalize',
    },
    description: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    moodContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        marginTop: 4,
    },
    moodLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginRight: 6,
    },
    moodValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1f2937',
        textTransform: 'capitalize',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#9ca3af',
        marginBottom: 20,
    },
    seedButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    seedButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
        zIndex: 50,
    },
    summaryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 40,
    },
    speedDialContainer: {
        position: 'absolute',
        bottom: 110,
        right: 28,
        alignItems: 'flex-end',
        zIndex: 50,
    },
    subFab: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    subFabIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 5,
        marginLeft: 12,
    },
    subFabLabel: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden',
    },
});
