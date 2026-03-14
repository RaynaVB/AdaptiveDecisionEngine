import React, { useCallback, useRef, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Dimensions, SafeAreaView, Platform, Animated, LayoutAnimation, UIManager, PanResponder } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { SymptomEvent } from '../../src/models/Symptom';
import { StorageService } from '../../src/services/storage';
import { Plus, X, Sparkles, TrendingUp, Trash2, LogOut, Beaker, Lightbulb } from 'lucide-react-native';
import { formatMealSummary } from '../../src/utils/mealSummary';
import { WeeklyReport } from '../../src/components/WeeklyReport';
import { generateInsightsFromPatterns, Insight } from '../../src/core/insight_engine/insightEngine';
import { runPatternEngine } from '../../src/core/pattern_engine/patternEngine';
import { auth } from '../../src/services/firebaseConfig';
import { signOut } from 'firebase/auth';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

type SwipeToDeleteProps = {
    onDelete: () => void;
    children: React.ReactNode;
};

function SwipeToDeleteCard({ onDelete, children }: SwipeToDeleteProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const THRESHOLD = SCREEN_WIDTH * 0.50;
    const deleteTriggered = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && Math.abs(dx) > Math.abs(dy) * 1.5,
            onPanResponderMove: (_, { dx }) => {
                if (dx > 0) translateX.setValue(dx);
            },
            onPanResponderRelease: (_, { dx, vx }) => {
                if (dx > THRESHOLD || vx > 1.0) {
                    Animated.timing(translateX, {
                        toValue: SCREEN_WIDTH,
                        duration: 250,
                        useNativeDriver: true,
                    }).start(() => {
                        if (!deleteTriggered.current) {
                            deleteTriggered.current = true;
                            onDelete();
                        }
                    });
                } else {
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 6,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            },
        })
    ).current;

    const bgOpacity = translateX.interpolate({
        inputRange: [0, THRESHOLD * 0.3, THRESHOLD],
        outputRange: [0, 0.3, 1],
        extrapolate: 'clamp',
    });

    return (
        <View>
            <Animated.View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: '#ef4444',
                    borderRadius: 12,
                    opacity: bgOpacity,
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingLeft: 20,
                    flexDirection: 'row',
                    gap: 8,
                    paddingTop: 0,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' }}>
                    <Trash2 color="#fff" size={26} />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Delete</Text>
                </View>
            </Animated.View>
            <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
                {children}
            </Animated.View>
        </View>
    );
}

type TimelineScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Timeline'>;

export default function TimelineScreen() {
    const navigation = useNavigation<TimelineScreenNavigationProp>();
    // Union Type for List
    type TimelineItem = { type: 'meal', data: MealEvent } | { type: 'mood', data: MoodEvent } | { type: 'symptom', data: SymptomEvent };
    type TimelineSection = { title: string, data: TimelineItem[] };

    const [timelineData, setTimelineData] = useState<TimelineSection[]>([]);
    const [meals, setMeals] = useState<MealEvent[]>([]);
    const [moods, setMoods] = useState<MoodEvent[]>([]);
    const [symptoms, setSymptoms] = useState<SymptomEvent[]>([]);
    const [weeklyInsights, setWeeklyInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);
    
    // Chart State
    const [chartData, setChartData] = useState<{ labels: string[], datasets: [{ data: number[], color?: any }], barData: number[] } | null>(null);

    const loadData = async () => {
        setLoading(true);
        const loadedMeals = await StorageService.getMealEvents();
        const loadedMoods = await StorageService.getMoodEvents();
        const loadedSymptoms = await StorageService.getSymptomEvents();

        // Strict requirement: Timeline shows last 7 days of items
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const filteredMeals = loadedMeals.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
        const filteredMoods = loadedMoods.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
        const filteredSymptoms = loadedSymptoms.filter(s => new Date(s.occurredAt) >= sevenDaysAgo);

        setMeals(filteredMeals);
        setMoods(loadedMoods); // Keep full mood list for context lookup
        setSymptoms(filteredSymptoms);

        // Merge and Sort
        const merged: TimelineItem[] = [
            ...filteredMeals.map(m => ({ type: 'meal' as const, data: m })),
            ...filteredMoods.map(m => ({ type: 'mood' as const, data: m })),
            ...filteredSymptoms.map(s => ({ type: 'symptom' as const, data: s }))
        ];

        // Sort fully by exact occurredAt time descending
        merged.sort((a, b) => new Date(b.data.occurredAt).getTime() - new Date(a.data.occurredAt).getTime());

        // Group by Day
        const grouped: { [key: string]: TimelineItem[] } = {};
        merged.forEach(item => {
            const d = new Date(item.data.occurredAt);
            // Format as "Wed, Oct 25" etc.
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

        const sections: TimelineSection[] = Object.keys(grouped).map(key => ({
            title: key,
            data: grouped[key]
        }));
        
        // Generate insights for weekly report
        const patterns = runPatternEngine(filteredMeals, filteredMoods, filteredSymptoms);
        const insights = generateInsightsFromPatterns(patterns);
        setWeeklyInsights(insights);

        // Compute Dual-Axis Chart Data
        const statsByDay: Record<string, { moodSum: number, moodCount: number, mealCount: number, symptomLoad: number, label: string }> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toLocaleDateString([], { weekday: 'short' });
            
            // Generate a short label like "Mon 10" to fit the axis
            const dayNum = d.getDate();
            const firstChar = dayStr ? dayStr.charAt(0) : '?';
            const shortLabel = `${firstChar} ${dayNum}`;
            
            // We use the full dayStr as a reliable key for the dictionary,
            // but we'll store the 'shortLabel' inside the stats object to use for the chart UI
            statsByDay[dayStr] = { moodSum: 0, moodCount: 0, mealCount: 0, symptomLoad: 0, label: shortLabel };
        }

        filteredMoods.forEach(m => {
            const d = new Date(m.occurredAt);
            const dayStr = d.toLocaleDateString([], { weekday: 'short' });
            if (statsByDay[dayStr]) {
                const val = typeof m.valence === 'number' ? m.valence : 3;
                statsByDay[dayStr].moodSum += val;
                statsByDay[dayStr].moodCount += 1;
            }
        });

        filteredMeals.forEach(m => {
            const d = new Date(m.occurredAt);
            const dayStr = d.toLocaleDateString([], { weekday: 'short' });
            if (statsByDay[dayStr]) {
                statsByDay[dayStr].mealCount += 1;
            }
        });

        filteredSymptoms.forEach(s => {
            const d = new Date(s.occurredAt);
            const dayStr = d.toLocaleDateString([], { weekday: 'short' });
            if (statsByDay[dayStr]) {
                statsByDay[dayStr].symptomLoad += s.severity;
            }
        });

        const labels: string[] = [];
        const lineData: number[] = [];
        const barData: number[] = [];

        Object.entries(statsByDay).forEach(([day, stats], index) => {
            // Only push a visible label every other day
            labels.push(index % 2 === 0 ? stats.label : "");
            // Let's plot Symptom Load on the line chart to show burden trends, or fallback to 0
            lineData.push(stats.symptomLoad);
            barData.push(stats.mealCount);
        });

        if (filteredMeals.length > 0 || filteredSymptoms.length > 0 || filteredMoods.length > 0) {
            setChartData({
                labels,
                datasets: [{ 
                    data: lineData,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})` // Red for symptoms
                }],
                barData
            });
        } else {
            setChartData(null);
        }

        setTimelineData(sections);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleLogout = useCallback(async () => {
        Alert.alert('Sign Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await signOut(auth);
                }
            }
        ]);
    }, []);

    const handleClear = useCallback(async () => {
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
    }, []);

    const deleteWithAnimation = useCallback(async (deleteOp: () => Promise<void>) => {
        LayoutAnimation.configureNext({
            duration: 300,
            update: { type: LayoutAnimation.Types.easeInEaseOut },
            delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });
        await deleteOp();
        await loadData();
    }, [loadData]);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false, // Turn off native header to fix the cutoff bug
        });
    }, [navigation, handleClear, handleLogout]);

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
            <SwipeToDeleteCard onDelete={() => deleteWithAnimation(() => StorageService.deleteMealEvent(item.id))}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <Text style={styles.time}>{timeString}</Text>
                            <View style={styles.slotBadge}>
                                <Text style={styles.slotText}>{item.mealSlot}</Text>
                            </View>
                        </View>
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
            </SwipeToDeleteCard>
        );
    };

    const renderMoodItem = (item: MoodEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Mood Color Logic
        const moodColor = item.valence === 'negative' ? '#fee2e2' : item.valence === 'positive' ? '#dcfce7' : '#f3f4f6';
        const borderColor = item.valence === 'negative' ? '#fca5a5' : item.valence === 'positive' ? '#86efac' : '#e5e7eb';

        return (
            <SwipeToDeleteCard onDelete={() => deleteWithAnimation(() => StorageService.deleteMoodEvent(item.id))}>
                <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: borderColor }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.time}>{timeString}</Text>
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
            </SwipeToDeleteCard>
        );
    };

    const renderSymptomItem = (item: SymptomEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <SwipeToDeleteCard onDelete={() => deleteWithAnimation(() => StorageService.deleteSymptomEvent(item.id))}>
                <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#ef4444' }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.time}>{timeString}</Text>
                        <View style={[styles.slotBadge, { backgroundColor: '#fee2e2' }]}>
                            <Text style={[styles.slotText, { color: '#991b1b' }]}>Symptom</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 24, marginRight: 8 }}>🤒</Text>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
                            {item.symptomType}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#4b5563', marginBottom: 8 }}>
                        Severity: {item.severity}/5 {item.durationMinutes ? `• ${item.durationMinutes} min` : ''}
                    </Text>

                    {item.notes && (
                        <Text style={[styles.description, { marginTop: 4 }]} numberOfLines={2}>
                            {item.notes}
                        </Text>
                    )}
                </View>
            </SwipeToDeleteCard>
        );
    };

    const renderItem = ({ item }: { item: TimelineItem }) => {
        if (item.type === 'meal') return renderMealItem(item.data);
        if (item.type === 'symptom') return renderSymptomItem(item.data);
        return renderMoodItem(item.data);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.customHeader}>
                <Text style={styles.headerTitleText}>Timeline</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('InsightFeed')} style={styles.headerIconButton}>
                        <Lightbulb color="#f59e0b" size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Recommendations')} style={styles.headerIconButton}>
                        <Sparkles color="#2563eb" size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('WeeklyPatterns')} style={styles.headerIconButton}>
                        <TrendingUp color="#2563eb" size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('HealthLab')} style={styles.headerIconButton}>
                        <Beaker color="#2563eb" size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClear} style={styles.headerIconButton}>
                        <Trash2 color="#ef4444" size={22} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.headerIconButton}>
                        <LogOut color="#ef4444" size={22} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.container}>
                {timelineData.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No logs found.</Text>
                    <TouchableOpacity style={styles.seedButton} onPress={handleSeed}>
                        <Text style={styles.seedButtonText}>Seed Demo Logs</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <SectionList
                    sections={timelineData}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
                    keyExtractor={item => item.data.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                    ListHeaderComponent={
                        <View style={{ paddingBottom: 16 }}>
                            <WeeklyReport symptoms={symptoms} insights={weeklyInsights} />
                            {chartData && (
                                <View style={styles.chartCard}>
                                    <Text style={styles.chartTitle}>Symptom Burden & Meals (7 Days)</Text>
                                    <View>
                                        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, marginTop: 4 }}>Daily Symptom Load (Severity Sum)</Text>
                                        {/* Foreground Line Chart for Symptom Trend */}
                                        <LineChart
                                            data={{
                                                labels: chartData.labels,
                                                datasets: chartData.datasets
                                            }}
                                            width={Dimensions.get("window").width - 64}
                                            height={160}
                                            yAxisLabel=""
                                            yAxisSuffix=""
                                            fromZero={false}
                                            withInnerLines={true}
                                            chartConfig={{
                                                backgroundColor: "#ffffff",
                                                backgroundGradientFrom: "#ffffff",
                                                backgroundGradientTo: "#ffffff",
                                                decimalPlaces: 1,
                                                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red string for line
                                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                                style: { borderRadius: 16 },
                                                propsForDots: { r: "4", strokeWidth: "2", stroke: "#ef4444" } // Red dots
                                            }}
                                            bezier
                                            style={{ marginVertical: 8, borderRadius: 16 }}
                                        />

                                        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, marginTop: 12 }}>Meals Logged</Text>
                                        {/* Background Bar Chart for Meal Frequency */}
                                        <BarChart
                                            data={{
                                                labels: chartData.labels,
                                                datasets: [{ data: chartData.barData }]
                                            }}
                                            width={Dimensions.get("window").width - 64}
                                            height={160}
                                            yAxisLabel=""
                                            yAxisSuffix=""
                                            fromZero={true}
                                            showValuesOnTopOfBars={true}
                                            withInnerLines={false}
                                            chartConfig={{
                                                backgroundColor: "#ffffff",
                                                backgroundGradientFrom: "#ffffff",
                                                backgroundGradientTo: "#ffffff",
                                                decimalPlaces: 0,
                                                color: (opacity = 1) => `rgba(147, 197, 253, ${opacity})`,
                                                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                                                barPercentage: 0.5,
                                                style: { borderRadius: 16 },
                                            }}
                                            style={{ marginVertical: 8, borderRadius: 16 }}
                                        />
                                    </View>
                                </View>
                            )}
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
                                navigation.navigate('SymptomLogger', { mode: 'symptom' });
                            }}
                        >
                            <Text style={styles.subFabLabel}>Log Symptom</Text>
                            <View style={[styles.subFabIcon, { backgroundColor: '#ef4444' }]} pointerEvents="none">
                                <Text style={{ fontSize: 24 }}>🤒</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.subFab}
                            onPress={() => {
                                setIsFabOpen(false);
                                navigation.navigate('SymptomLogger', { mode: 'mood' });
                            }}
                        >
                            <Text style={styles.subFabLabel}>Log Mood</Text>
                            <View style={[styles.subFabIcon, { backgroundColor: '#8b5cf6' }]} pointerEvents="none">
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
                            <View style={[styles.subFabIcon, { backgroundColor: '#2563eb' }]} pointerEvents="none">
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
                <View pointerEvents="none">
                    {isFabOpen ? <X color="#fff" size={32} /> : <Plus color="#fff" size={32} />}
                </View>
            </TouchableOpacity>
        </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? 40 : 0
    },
    customHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitleText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerIconButton: {
        marginLeft: 16,
        padding: 4,
    },
    deleteAction: {
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        width: 90,
        borderRadius: 12,
        marginBottom: 16,
        gap: 6,
    },
    deleteActionText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
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
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionHeader: {
        backgroundColor: '#f9fafb',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 12,
        marginTop: 8,
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
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
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
        alignSelf: 'flex-start',
    },
    chartLegend: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        marginBottom: 8,
        alignItems: 'center',
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#6b7280',
        marginRight: 16,
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
