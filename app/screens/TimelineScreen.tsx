import React, { useCallback, useRef, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Dimensions, SafeAreaView, Platform, Animated, LayoutAnimation, UIManager, PanResponder, Image, Modal, ScrollView } from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { SymptomEvent } from '../../src/models/Symptom';
import { StorageService } from '../../src/services/storage';
import { Plus, X, Sparkles, TrendingUp, Trash2, LogOut, Beaker, Lightbulb, Menu, Settings, ShieldCheck } from 'lucide-react-native';
import { formatMealSummary } from '../../src/utils/mealSummary';
import { WeeklyReport } from '../../src/components/WeeklyReport';
import { Insight } from '../../src/models/types';
import { InsightService } from '../../src/services/insightService';
// Pattern Engine is now server-side. Local imports removed.
import { auth } from '../../src/services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { getUserProfile, isInternalUser, UserProfile } from '../../src/services/userProfile';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { ExperimentRun } from '../../src/models/healthlab';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { Play, ChevronRight, Beaker as BeakerIcon } from 'lucide-react-native';

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
    const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: TimelineItem[] } | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [activeExperiments, setActiveExperiments] = useState<ExperimentRun[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Week at a Glance State
    const [weekAtGlanceData, setWeekAtGlanceData] = useState<{ label: string; score: number; dateStr: string; displayDate: string; events: TimelineItem[] }[]>([]);

    const handleStartExperimentFocus = async (experimentId: string) => {
        try {
            setLoading(true);
            await ExperimentEngine.startExperiment(experimentId);
            Alert.alert("Success", "Experiment started! You can track your progress right here on the home screen.");
            await loadData();
        } catch (e) {
            console.error("Failed to start experiment from focus:", e);
            Alert.alert("Error", "Could not start experiment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        const [loadedMeals, loadedMoods, loadedSymptoms, activeExps] = await Promise.all([
            StorageService.getMealEvents(),
            StorageService.getMoodEvents(),
            StorageService.getSymptomEvents(),
            ExperimentEngine.getActiveExperiments()
        ]);
        
        setActiveExperiments(activeExps);
        
        if (auth.currentUser) {
            const profile = await getUserProfile(auth.currentUser.uid);
            setUserProfile(profile);
        }

        // Strict requirement: Timeline shows last 5 days of items
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        const filteredMeals = loadedMeals.filter(m => new Date(m.occurredAt) >= fiveDaysAgo);
        const filteredMoods = loadedMoods.filter(m => new Date(m.occurredAt) >= fiveDaysAgo);
        const filteredSymptoms = loadedSymptoms.filter(s => new Date(s.occurredAt) >= fiveDaysAgo);

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
        const insightsResponse = await InsightService.getInsights();
        setWeeklyInsights(insightsResponse.insights);

        // Compute Week at a Glance (7 Days)
        const weekAtGlance: { label: string; score: number; dateStr: string; displayDate: string; events: TimelineItem[] }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const weekdayShort = d.toLocaleDateString([], { weekday: 'short' });
            const label = weekdayShort ? weekdayShort.charAt(0) : '?';
            const dateStr = d.toLocaleDateString();
            const displayDate = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            weekAtGlance.push({ label, score: 0, dateStr, displayDate, events: [] });
        }

        const sevenDaysAgoForDots = new Date();
        sevenDaysAgoForDots.setDate(sevenDaysAgoForDots.getDate() - 7);
        
        const recentSymptomsForDots = loadedSymptoms.filter(s => new Date(s.occurredAt) >= sevenDaysAgoForDots);
        const recentMealsForDots = loadedMeals.filter(m => new Date(m.occurredAt) >= sevenDaysAgoForDots);
        const recentMoodsForDots = loadedMoods.filter(m => new Date(m.occurredAt) >= sevenDaysAgoForDots);
        
        const merged7Days: TimelineItem[] = [
            ...recentMealsForDots.map(m => ({ type: 'meal' as const, data: m })),
            ...recentMoodsForDots.map(m => ({ type: 'mood' as const, data: m })),
            ...recentSymptomsForDots.map(s => ({ type: 'symptom' as const, data: s }))
        ];
        merged7Days.sort((a, b) => new Date(b.data.occurredAt).getTime() - new Date(a.data.occurredAt).getTime());

        merged7Days.forEach(item => {
            const dStr = new Date(item.data.occurredAt).toLocaleDateString();
            const dayEntry = weekAtGlance.find(w => w.dateStr === dStr);
            if (dayEntry) {
                dayEntry.events.push(item);
                if (item.type === 'symptom') {
                    dayEntry.score += item.data.severity;
                }
            }
        });

        setWeekAtGlanceData(weekAtGlance);

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
    }, [navigation, handleLogout]);

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
                <View style={styles.timelineRow}>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeColumnText}>{timeString}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.card, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }]}
                        onPress={() => navigation.navigate('MealDetail', { mealId: item.id })}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleRow}>
                                <View style={styles.slotBadge}>
                                    <Text style={styles.slotText}>{item.mealSlot}</Text>
                                </View>
                            </View>
                        </View>

                        {item.photoUri ? (
                            <Image source={{ uri: item.photoUri }} style={styles.mealImage} resizeMode="cover" />
                        ) : null}

                        <Text style={styles.summaryText}>{formatMealSummary(item)}</Text>

                        {item.textDescription ? (
                            <Text style={styles.description} numberOfLines={1}>{item.textDescription}</Text>
                        ) : null}

                        {mood ? (
                            <View style={[styles.moodContainer, { backgroundColor: moodColor }]}>
                                <Text style={styles.moodLabel}>Mood context:</Text>
                                <Text style={styles.moodValue}>{moodText}</Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                </View>
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
                <View style={styles.timelineRow}>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeColumnText}>{timeString}</Text>
                    </View>
                    <View style={[styles.card, { flex: 1, borderLeftWidth: 4, borderLeftColor: borderColor }]}>
                        <View style={styles.cardHeader}>
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
                </View>
            </SwipeToDeleteCard>
        );
    };

    const renderSymptomItem = (item: SymptomEvent) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <SwipeToDeleteCard onDelete={() => deleteWithAnimation(() => StorageService.deleteSymptomEvent(item.id))}>
                <View style={styles.timelineRow}>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeColumnText}>{timeString}</Text>
                    </View>
                    <View style={[styles.card, { flex: 1, borderLeftWidth: 4, borderLeftColor: '#ef4444' }]}>
                        <View style={styles.cardHeader}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.headerTitleText}>Timeline</Text>
                    <View style={styles.miniBadge}>
                        <Text style={styles.miniBadgeText}>BETA</Text>
                    </View>
                </View>
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
                    <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.headerIconButton}>
                        <Menu color="#4b5563" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.container}>
                {timelineData.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No logs found.</Text>
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
                                {activeExperiments.length > 0 && (
                                    <View style={styles.activeExperimentsSection}>
                                        <Text style={[styles.chartTitle, { marginBottom: 12 }]}>Active Experiments</Text>
                                        {activeExperiments.map(run => (
                                            <TouchableOpacity 
                                                key={run.id}
                                                style={styles.activeExpCard}
                                                onPress={() => navigation.navigate('HealthLab')}
                                            >
                                                <View style={styles.activeExpIcon}>
                                                    <Play size={20} color="#fff" fill="#fff" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.activeExpTitle}>
                                                        {EXPERIMENT_LIBRARY.find(e => e.id === run.experimentId)?.name || 'Unknown'}
                                                    </Text>
                                                    <Text style={styles.activeExpSub}>Day {Math.floor((Date.now() - new Date(run.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} of {EXPERIMENT_LIBRARY.find(e => e.id === run.experimentId)?.durationDays}</Text>
                                                </View>
                                                <ChevronRight size={20} color="#94a3b8" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <WeeklyReport 
                                    symptoms={symptoms} 
                                    insights={weeklyInsights} 
                                    activeExperiments={activeExperiments} 
                                    onStartExperiment={handleStartExperimentFocus}
                                />
                                {weekAtGlanceData.length > 0 && (
                                    <View style={[styles.chartCard, { paddingVertical: 20 }]}>
                                        <Text style={styles.chartTitle}>Week at a Glance</Text>
                                        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, marginTop: 4, alignSelf: 'flex-start' }}>
                                            Symptom Burden (7 Days)
                                        </Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 4 }}>
                                            {weekAtGlanceData.map((day, idx) => {
                                                let bgColor = '#f3f4f6'; // Minimal Grey
                                                if (day.score === 0) bgColor = '#f3f4f6';
                                                else if (day.score <= 3) bgColor = '#fde047'; // Yellow
                                                else if (day.score <= 6) bgColor = '#fb923c'; // Orange
                                                else bgColor = '#ef4444'; // Red
                                                
                                                return (
                                                    <TouchableOpacity 
                                                        key={idx} 
                                                        style={{ alignItems: 'center' }}
                                                        onPress={() => {
                                                            if (day.events.length > 0) {
                                                                setSelectedDayEvents({ dateStr: day.displayDate, events: day.events });
                                                            } else {
                                                                Alert.alert('No Logs', 'You had no activity logged on this day.');
                                                            }
                                                        }}
                                                    >
                                                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: bgColor, marginBottom: 8 }}>
                                                            {day.events.length > 0 && (
                                                                <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#3b82f6', borderRadius: 8, width: 16, height: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff' }}>
                                                                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>{day.events.length}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={{ fontSize: 13, color: '#4b5563', fontWeight: '500' }}>{day.label}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                                <Text style={styles.subtitle}>Showing last 5 days</Text>
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

                {/* Custom Daily Timeline Modal */}
                <Modal
                    visible={selectedDayEvents !== null}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedDayEvents(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: '#e0e7ff', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                        <Text style={{ fontSize: 20 }}>🗓️</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.modalTitle}>Daily Timeline</Text>
                                        <Text style={styles.modalSubtitle}>{selectedDayEvents?.dateStr}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedDayEvents(null)} style={{ padding: 4 }}>
                                    <X color="#9ca3af" size={24} />
                                </TouchableOpacity>
                            </View>
                            
                            <SectionList
                                style={{ maxHeight: Dimensions.get('window').height * 0.6 }}
                                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                                sections={[{ title: 'Events', data: selectedDayEvents?.events || [] }]}
                                renderItem={({ item }) => {
                                    const timeStr = new Date(item.data.occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                    
                                    if (item.type === 'symptom') {
                                        const sym = item.data;
                                        let severityColor = '#fbbf24';
                                        if (sym.severity >= 4) severityColor = '#ef4444';
                                        else if (sym.severity === 3) severityColor = '#f97316';
                                        
                                        return (
                                            <View style={[styles.timelineRow, { marginBottom: 2 }]}>
                                                <View style={[styles.timeColumn, { width: 60, paddingRight: 6 }]}>
                                                    <Text style={[styles.timeColumnText, { fontSize: 11 }]}>{timeStr}</Text>
                                                </View>
                                                <View style={[styles.card, { flex: 1, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: severityColor, shadowOpacity: 0, elevation: 0 }]}>
                                                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4}}>
                                                        <View style={{flexDirection: 'row', alignItems: 'center', flexShrink: 1, paddingRight: 8}}>
                                                            <Text style={{fontSize: 16, marginRight: 6}}>🤒</Text>
                                                            <Text style={[styles.symptomTypeName, { marginBottom: 0, fontSize: 14 }]} numberOfLines={1}>{sym.symptomType}</Text>
                                                        </View>
                                                        <View style={{alignItems: 'flex-end'}}>
                                                            <Text style={[styles.symptomSeverityText, { color: severityColor, marginBottom: 2, fontSize: 11 }]}>Severity: {sym.severity}/5</Text>
                                                            <View style={styles.severityBarContainer}>
                                                                {[1,2,3,4,5].map(level => (
                                                                    <View key={level} style={[styles.severitySegment, { height: 3, width: 8, backgroundColor: level <= sym.severity ? severityColor : '#e5e7eb' }]} />
                                                                ))}
                                                            </View>
                                                        </View>
                                                    </View>
                                                    {sym.notes ? <Text style={[styles.symptomNotes, { marginTop: 4 }]} numberOfLines={2}>{sym.notes}</Text> : null}
                                                </View>
                                            </View>
                                        );
                                    } else if (item.type === 'meal') {
                                        const meal = item.data;
                                        return (
                                            <View style={[styles.timelineRow, { marginBottom: 2 }]}>
                                                <View style={[styles.timeColumn, { width: 60, paddingRight: 6 }]}>
                                                    <Text style={[styles.timeColumnText, { fontSize: 11 }]}>{timeStr}</Text>
                                                </View>
                                                <View style={[styles.card, { flex: 1, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#3b82f6', shadowOpacity: 0, elevation: 0 }]}>
                                                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                                                        <Text style={{fontSize: 16, marginRight: 6}}>🍽️</Text>
                                                        <Text style={[styles.symptomTypeName, { marginBottom: 0, fontSize: 14 }]} numberOfLines={1}>{meal.mealSlot}</Text>
                                                    </View>
                                                    <Text style={styles.symptomNotes} numberOfLines={2}>{formatMealSummary(meal)}</Text>
                                                </View>
                                            </View>
                                        );
                                    } else {
                                        const mood = item.data;
                                        let emoji = '😐';
                                        if (mood.valence === 'positive') emoji = '🙂';
                                        else if (mood.valence === 'negative') emoji = '🙁';
                                        const borderColor = mood.valence === 'negative' ? '#fca5a5' : mood.valence === 'positive' ? '#86efac' : '#e5e7eb';
                                        
                                        return (
                                            <View style={[styles.timelineRow, { marginBottom: 2 }]}>
                                                <View style={[styles.timeColumn, { width: 60, paddingRight: 6 }]}>
                                                    <Text style={[styles.timeColumnText, { fontSize: 11 }]}>{timeStr}</Text>
                                                </View>
                                                <View style={[styles.card, { flex: 1, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: borderColor, shadowOpacity: 0, elevation: 0 }]}>
                                                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                                                        <Text style={{fontSize: 16, marginRight: 6}}>{emoji}</Text>
                                                        <Text style={[styles.symptomTypeName, { marginBottom: 0, fontSize: 14 }]}>Mood</Text>
                                                    </View>
                                                    <Text style={styles.symptomNotes} numberOfLines={2}>{mood.valence} mood, {mood.energy} energy</Text>
                                                </View>
                                            </View>
                                        );
                                    }
                                }}
                                keyExtractor={(item) => item.data.id}
                            />
                            
                            <TouchableOpacity 
                                style={styles.modalCloseButton} 
                                onPress={() => setSelectedDayEvents(null)}
                            >
                                <Text style={styles.modalCloseText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Hamburger Menu Modal */}
                <Modal
                    visible={isMenuOpen}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setIsMenuOpen(false)}
                >
                    <TouchableOpacity 
                        style={styles.menuBackdrop} 
                        activeOpacity={1} 
                        onPress={() => setIsMenuOpen(false)}
                    >
                        <View style={styles.menuContent}>
                            <TouchableOpacity 
                                style={styles.menuItem}
                                onPress={() => {
                                    setIsMenuOpen(false);
                                    navigation.navigate('Settings');
                                }}
                            >
                                <Settings color="#3b82f6" size={20} />
                                <Text style={styles.menuItemText}>Preferences</Text>
                            </TouchableOpacity>

                            {isInternalUser(userProfile) && (
                                <TouchableOpacity 
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setIsMenuOpen(false);
                                        navigation.navigate('Admin');
                                    }}
                                >
                                    <ShieldCheck color="#10b981" size={20} />
                                    <Text style={[styles.menuItemText, { color: '#10b981' }]}>Admin System</Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.menuDivider} />

                            <TouchableOpacity 
                                style={styles.menuItem}
                                onPress={() => {
                                    setIsMenuOpen(false);
                                    handleLogout();
                                }}
                            >
                                <LogOut color="#6b7280" size={20} />
                                <Text style={styles.menuItemText}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
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
        paddingTop: Platform.OS === 'ios' ? 12 : 0,
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
    miniBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    miniBadgeText: {
        color: '#2563eb',
        fontSize: 10,
        fontWeight: '800',
    },
    headerIconButton: {
        marginLeft: 12,
        padding: 4,
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    menuContent: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 60,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    menuItemText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 4,
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
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    timeColumn: {
        width: 65,
        paddingTop: 16,
        paddingRight: 10,
        alignItems: 'flex-end',
    },
    timeColumnText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
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
    mealImage: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: '#f3f4f6'
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.6)', // dark transparent
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    modalBody: {
        padding: 20,
    },
    modalSymptomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    symptomTypeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    symptomNotes: {
        fontSize: 13,
        color: '#6b7280',
        fontStyle: 'italic',
    },
    symptomSeverityText: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    severityBarContainer: {
        flexDirection: 'row',
        gap: 2,
    },
    severitySegment: {
        width: 12,
        height: 4,
        borderRadius: 2,
    },
    modalCloseButton: {
        backgroundColor: '#f3f4f6',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    activeExperimentsSection: {
        marginBottom: 24,
    },
    activeExpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    activeExpIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activeExpTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    activeExpSub: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    }
});
