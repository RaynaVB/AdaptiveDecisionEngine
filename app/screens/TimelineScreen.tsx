import React, { useCallback, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Dimensions, SafeAreaView, Platform, LayoutAnimation, UIManager, Image, Modal } from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { SymptomEvent } from '../../src/models/Symptom';
import { StorageService } from '../../src/services/storage';
import { X, Utensils, Zap, Smile, CheckCircle2 } from 'lucide-react-native';
import { formatMealSummary } from '../../src/utils/mealSummary';
import { Insight } from '../../src/models/types';
import { InsightService } from '../../src/services/insightService';
// Pattern Engine is now server-side. Local imports removed.
import { auth } from '../../src/services/firebaseConfig';
import { getUserProfile, UserProfile } from '../../src/services/userProfile';
import { HealthLabService } from '../../src/services/healthLabService';
import { ExperimentRun } from '../../src/models/healthlab';
import { RecommendationService } from '../../src/services/recommendationService';
import { WeeklyPatternsService } from '../../src/services/weeklyPatternsService';
import { Recommendation, WeeklyItem } from '../../src/models/types';

// New Homepage Components
import { HeroAction } from '../components/home/HeroAction';
import { HeadsUp } from '../components/home/HeadsUp';
import { ActiveExperimentCard } from '../components/ActiveExperimentCard';
import { WeeklyIntelligence } from '../components/home/WeeklyIntelligence';
import { WeekAtAGlance, WeekAtGlanceData } from '../components/home/WeekAtAGlance';
import { MicroInsightCard } from '../components/home/MicroInsightCard';
import { TopBar } from '../components/TopBar';
import { SmartFAB } from '../components/home/SmartFAB';
import { WinsWidget } from '../components/home/WinsWidget';
import { StreakService, StreakData } from '../../src/services/StreakService';
import { NotificationService } from '../../src/services/NotificationService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TimelineScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Timeline'>;

import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

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

    // AI Intelligence State
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [weeklyItems, setWeeklyItems] = useState<WeeklyItem[]>([]);
    const [headsUpItems, setHeadsUpItems] = useState<string[]>([]);
    const [microInsights, setMicroInsights] = useState<Insight[]>([]);
    const [dismissedRecIds, setDismissedRecIds] = useState<Set<string>>(new Set());

    // Week at a Glance State
    const [weekAtGlanceData, setWeekAtGlanceData] = useState<{ label: string; score: number; dateStr: string; displayDate: string; events: TimelineItem[] }[]>([]);

    // Streak State
    const [streakData, setStreakData] = useState<StreakData | null>(null);

    const handleStartExperimentFocus = async (experimentId: string) => {
        try {
            setLoading(true);
            await HealthLabService.startExperiment(experimentId);
            Alert.alert("Success", "Experiment started! You can track your progress right here on the home screen.");
            await loadData();
        } catch (e) {
            console.error("Failed to start experiment from focus:", e);
            Alert.alert("Error", "Could not start experiment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleStartHero = async (rec: Recommendation) => {
        if (rec.associatedExperimentId) {
            await handleStartExperimentFocus(rec.associatedExperimentId);
        } else {
            // Mark as accepted
            await RecommendationService.submitAction(rec.generationId, rec.id, 'accepted');
            
            if (rec.cta?.type === 'log' || rec.title.toLowerCase().includes('pairing')) {
                navigation.navigate('LogMeal');
            } else if (rec.type === 'experiment' || rec.associatedExperimentId) {
                await handleStartExperimentFocus(rec.associatedExperimentId || rec.id);
            } else if (rec.type === 'lifestyle') {
                Alert.alert("Action Started", `Great choice! We'll track your ${rec.title} over the next few days.`);
                await loadData();
            } else {
                Alert.alert("Recommendation", `Starting: ${rec.title}`);
                await loadData();
            }
        }
    };

    const handleDismissRecommendation = async (rec: Recommendation) => {
        try {
            await RecommendationService.submitAction(rec.generationId, rec.id, 'dismissed');
            setDismissedRecIds(prev => new Set(prev).add(rec.id));
            await loadData();
        } catch (e) {
            console.error("Failed to dismiss recommendation:", e);
        }
    };

    const handleMaybeRecommendation = async (rec: Recommendation) => {
        try {
            await RecommendationService.submitAction(rec.generationId, rec.id, 'maybe');
            setDismissedRecIds(prev => new Set(prev).add(rec.id)); // Treat as 'acted' for homepage
            await loadData();
        } catch (e) {
            console.error("Failed to submit maybe feedback:", e);
        }
    };

    const handleStartTest = async (item: WeeklyItem) => {
        // Find best experiment or action for this weekly pattern
        if (item.metadata?.experimentIdToStart) {
            await handleStartExperimentFocus(item.metadata.experimentIdToStart);
        } else {
            navigation.navigate('HealthLab');
        }
    };

    const loadData = async () => {
        setLoading(true);
        const [loadedMeals, loadedMoods, loadedSymptoms, activeExps, recsResponse, weeklyResponse, insightsResponse] = await Promise.all([
            StorageService.getMealEvents(),
            StorageService.getMoodEvents(),
            StorageService.getSymptomEvents(),
            HealthLabService.getActiveExperiments().catch(() => []),
            RecommendationService.getRecommendations().catch(() => ({ recommendations: [] })),
            WeeklyPatternsService.getWeeklySummary().catch(() => ({ items: [] })),
            InsightService.getInsights().catch(() => ({ insights: [] }))
        ]);
        
        // Filter out recommendations that have been acted upon (local or backend state)
        const allRecs = (recsResponse.recommendations || []).filter(r => 
            !dismissedRecIds.has(r.id) && 
            (r.action?.state === 'none' || !r.action?.state)
        );
        
        setRecommendations(allRecs);
        
        const headsUp = allRecs
            .slice(1) // Skip the hero
            .filter((r: Recommendation) => r.priorityScore > 0.7)
            .map((r: Recommendation) => r.summary);
            
        const uniqueHeadsUp = Array.from(new Set(headsUp)).slice(0, 2);
        setHeadsUpItems(uniqueHeadsUp);

        const micro = (insightsResponse.insights || [])
            .filter((i: Insight) => i.confidenceLevel === 'medium')
            .slice(0, 3);
        setMicroInsights(micro);
        setWeeklyInsights(insightsResponse.insights || []);
        setWeeklyItems(weeklyResponse.items || []);
        
        if (auth.currentUser) {
            const profile = await getUserProfile(auth.currentUser.uid);
            setUserProfile(profile);
        }

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const filteredMeals = loadedMeals.filter(m => new Date(m.occurredAt) >= threeDaysAgo);
        const filteredMoods = loadedMoods.filter(m => new Date(m.occurredAt) >= threeDaysAgo);
        const filteredSymptoms = loadedSymptoms.filter(s => new Date(s.occurredAt) >= threeDaysAgo);

        setMeals(filteredMeals);
        setMoods(filteredMoods); 
        setSymptoms(filteredSymptoms);

        const merged: TimelineItem[] = [
            ...filteredMeals.map(m => ({ type: 'meal' as const, data: m })),
            ...filteredMoods.map(m => ({ type: 'mood' as const, data: m })),
            ...filteredSymptoms.map(s => ({ type: 'symptom' as const, data: s }))
        ];

        merged.sort((a, b) => new Date(b.data.occurredAt).getTime() - new Date(a.data.occurredAt).getTime());

        const grouped: { [key: string]: TimelineItem[] } = {};
        merged.forEach(item => {
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

        const sections: TimelineSection[] = Object.keys(grouped).map(key => ({
            title: key,
            data: grouped[key]
        }));

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
        setActiveExperiments(activeExps);

        // Compute streaks from full event history (not the 3-day filtered subset)
        try {
            const computed = await StreakService.computeStreaks(loadedMeals, loadedMoods, loadedSymptoms);
            setStreakData(computed);
            const newMilestone = await StreakService.getNewMilestone(computed);
            if (newMilestone !== null) {
                NotificationService.scheduleStreakMilestoneNotification(newMilestone);
            }
        } catch (e) {
            console.error('[StreakService] Failed to compute streaks:', e);
        }

        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );



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

    const renderMealItem = (item: MealEvent, isModal: boolean = false) => {
        const date = new Date(item.occurredAt);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const mood = getMoodForMeal(item);

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
                        <Image source={{ uri: item.photoUri }} style={[styles.mealImage, isModal && { height: 100 }, { marginBottom: Spacing.s3 }] as any} resizeMode="cover" />
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

    const renderItem = ({ item, isModal = false }: { item: TimelineItem, isModal?: boolean }) => {
        if (item.type === 'meal') return renderMealItem(item.data, isModal);
        if (item.type === 'symptom') return renderSymptomItem(item.data);
        return renderMoodItem(item.data);
    };

    return (
        <View style={[styles.container, { backgroundColor: Colors.background }]}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} />
            
            <TopBar userProfile={userProfile} />

            <SectionList
                sections={timelineData}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>{title}</Text>
                        <View style={styles.sectionDivider} />
                    </View>
                )}
                keyExtractor={item => `${item.type}-${item.data.id}`}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={Colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>Nothing here yet</Text>
                        <Text style={styles.emptyStateBody}>
                            Tap the + button to log a meal, mood, or symptom. Your recent activity will appear here.
                        </Text>
                    </View>
                }
                ListHeaderComponent={
                    <View style={{ paddingBottom: 24 }}>
                        <View style={styles.pageHeader}>
                            <Text style={styles.headerLabel}>Today's Snapshot</Text>
                            <Text style={styles.pageTitle}>Timeline</Text>
                        </View>
                        {/* 1. Hero — Best Next Action */}
                        <HeroAction 
                            recommendation={recommendations[0]} 
                            onStart={handleStartHero}
                            onMaybe={handleMaybeRecommendation}
                            onDismiss={handleDismissRecommendation}
                        />

                        {/* 2. Heads Up (Predictive Intelligence) - Only show if items exist */}
                        {headsUpItems.length > 0 && <HeadsUp items={headsUpItems} />}

                        {/* 2b. Streak & Consistency */}
                        {streakData && <WinsWidget streakData={streakData} />}

                        {/* 3. Active Experiment */}
                        {activeExperiments.map(run => (
                            <ActiveExperimentCard 
                                key={`active-exp-${run.runId || run.id}`}
                                experiment={run}
                                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: run.id })}
                            />
                        ))}

                        {/* 4. Weekly Intelligence */}
                        <WeeklyIntelligence 
                            items={weeklyItems} 
                            onStartTest={handleStartTest}
                        />

                        {/* 5. Week at a Glance */}
                        <WeekAtAGlance 
                            data={weekAtGlanceData.length > 0 ? weekAtGlanceData.map(d => ({
                                label: d.label,
                                score: d.score,
                                dateStr: d.dateStr,
                                displayDate: d.displayDate,
                                hasEvents: d.events.length > 0,
                                eventCount: d.events.length
                            })) : [
                                { label: 'M', score: 0, dateStr: '', displayDate: '', hasEvents: false, eventCount: 0 },
                                { label: 'T', score: 0, dateStr: '', displayDate: '', hasEvents: false, eventCount: 0 },
                                { label: 'W', score: 0, dateStr: '', displayDate: '', hasEvents: false, eventCount: 0 },
                                { label: 'T', score: 0, dateStr: '', displayDate: '', hasEvents: false, eventCount: 0 },
                                { label: 'F', score: 0, dateStr: '', displayDate: '', hasEvents: false, eventCount: 0 },
                                { label: 'S', score: 0, dateStr: '', displayDate: '', hasEvents: false, eventCount: 0 },
                                { label: 'S', score: 0, dateStr: '', displayDate: '', hasEvents: false, eventCount: 0 },
                            ]}
                            onPressDay={(d) => {
                                const day = weekAtGlanceData.find(w => w.dateStr === d.dateStr);
                                if (day && day.events.length > 0) {
                                    setSelectedDayEvents({ dateStr: d.displayDate, events: day.events });
                                } else {
                                    Alert.alert('No Logs', 'Log your symptoms daily to see them reflected here.');
                                }
                            }}
                        />

                        {/* 6. Micro Insight */}
                        {microInsights.length > 0 ? microInsights.map((insight, index) => (
                            <MicroInsightCard key={`insight-${insight.id || index}`} insight={insight} />
                        )) : (
                            <View style={styles.insightPlaceholder}>
                                <Text style={styles.insightPlaceholderText}>
                                    Log a few meals and moods to unlock your first personalized insight.
                                </Text>
                            </View>
                        )}

                        <View style={styles.recentActivityHeader}>
                            <Text style={styles.recentActivityTitle}>Recent Activity</Text>
                            <Text style={styles.recentActivitySubtitle}>Showing last 3 days</Text>
                        </View>
                    </View>
                }
            />

            <SmartFAB 
                hasActiveExperiment={activeExperiments.length > 0}
                onLogMeal={() => navigation.navigate('LogMeal')}
                onLogSymptom={() => navigation.navigate('SymptomLogger')}
                onLogMood={() => navigation.navigate('MoodLogger')}
                onLogProgress={() => navigation.navigate('SymptomLogger')}
            />

            {/* Daily Timeline Modal */}
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
                                <View style={{ backgroundColor: Colors.surfaceContainer, padding: Spacing.s2, borderRadius: Radii.md, marginRight: Spacing.s3 }}>
                                    <Text style={{ fontSize: 20 }}>🗓️</Text>
                                </View>
                                <View>
                                    <Text style={styles.modalTitle}>Daily Timeline</Text>
                                    <Text style={styles.modalSubtitle}>{selectedDayEvents?.dateStr}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setSelectedDayEvents(null);
                                        navigation.navigate('LogMeal');
                                    }} 
                                    style={{ marginRight: Spacing.s4, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.full }}
                                >
                                    <Utensils color={Colors.primary} size={16} style={{ marginRight: 6 }} />
                                    <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>Log Meal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setSelectedDayEvents(null)} style={{ padding: 4 }}>
                                    <X color={Colors.onSurfaceVariant} size={24} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <SectionList
                            style={{ maxHeight: Dimensions.get('window').height * 0.7 }}
                            contentContainerStyle={{ paddingHorizontal: Spacing.s4, paddingBottom: Spacing.s4, paddingTop: Spacing.s2 }}
                            sections={[{ title: 'Events', data: selectedDayEvents?.events || [] }]}
                            renderItem={(props) => renderItem({ ...props, isModal: true })}
                            keyExtractor={(item) => `${item.type}-modal-${item.data.id}`}
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

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    editorialHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.s4,
        paddingTop: Spacing.s4,
        paddingBottom: Spacing.s3,
    },
    pageHeader: {
        paddingTop: Spacing.s4,
        paddingBottom: Spacing.s3,
    },
    headerLabel: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        marginBottom: 4,
        textTransform: 'none',
    },
    pageTitle: {
        ...Typography.display,
        fontSize: 36,
        color: Colors.onSurface,
    },
    adminBadge: {
        backgroundColor: Colors.surfaceContainer,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Radii.md,
        marginBottom: 8,
    },
    adminBadgeText: {
        ...Typography.label,
        color: Colors.primary,
        fontWeight: '800',
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
        height: 1,
        backgroundColor: Colors.surfaceContainer,
        marginTop: Spacing.s1,
        width: 40,
        marginBottom: Spacing.s3,
    },
    listContent: {
        paddingHorizontal: Spacing.s4,
        paddingBottom: 120,
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: Spacing.s4,
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
    timeColumn: {
        width: 60,
        paddingTop: Spacing.s3,
    },
    timeColumnText: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
    },
    card: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.xl,
        padding: Spacing.s3,
        marginBottom: Spacing.s3,
        ...Shadows.ambient,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.s2,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    slotBadge: {
        backgroundColor: Colors.surfaceContainerLow,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radii.md,
    },
    slotText: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'capitalize',
    },
    summaryText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.onSurface,
        marginBottom: 4,
    },
    description: {
        ...Typography.body,
        color: Colors.onSurfaceVariant,
        fontSize: 14,
    },
    mealImage: {
        width: '100%',
        height: 200,
        borderRadius: Radii.lg,
        marginBottom: Spacing.s2,
    },
    moodContainer: {
        marginTop: Spacing.s2,
        padding: Spacing.s1,
        borderRadius: Radii.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    moodLabel: {
        ...Typography.label,
        marginRight: 4,
        textTransform: 'none',
    },
    moodValue: {
        ...Typography.label,
        fontWeight: '700',
        textTransform: 'none',
    },
    recentActivityHeader: {
        paddingHorizontal: Spacing.s4,
        marginTop: Spacing.s4,
        marginBottom: Spacing.s2,
    },
    recentActivityTitle: {
        ...Typography.headline,
        fontSize: 24,
        color: Colors.onSurface,
    },
    recentActivitySubtitle: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.scrim,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.s4,
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderRadius: Radii.xl,
        width: '100%',
        maxHeight: '80%',
        ...Shadows.ambient,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.s4,
    },
    modalTitle: {
        ...Typography.title,
        color: Colors.onSurface,
    },
    modalSubtitle: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
    },
    modalCloseButton: {
        padding: Spacing.s4,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainer,
    },
    modalCloseText: {
        ...Typography.label,
        color: Colors.primary,
        textTransform: 'none',
        fontSize: 16,
    },
    symptomTypeName: {
        ...Typography.body,
        fontWeight: '700',
    },
    symptomNotes: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
    },
    tag: {
        backgroundColor: Colors.surfaceContainer,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radii.md,
        marginRight: 4,
    },
    tagText: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
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
        paddingHorizontal: Spacing.s4,
        paddingTop: Spacing.s4,
        paddingBottom: Spacing.s6,
        alignItems: 'center',
    },
    emptyStateTitle: {
        ...Typography.title,
        fontSize: 17,
        color: Colors.onSurfaceVariant,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateBody: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.outline,
        textAlign: 'center',
        lineHeight: 20,
    },
    insightPlaceholder: {
        paddingHorizontal: Spacing.s1,
        marginBottom: Spacing.s6,
    },
    insightPlaceholderText: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: Colors.scrimLight,
    },
    menuContent: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 60,
        right: 16,
        backgroundColor: Colors.background,
        borderRadius: Radii.lg,
        padding: Spacing.s2,
        minWidth: 180,
        ...Shadows.ambient,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.s3,
        borderRadius: Radii.md,
    },
    menuItemText: {
        marginLeft: Spacing.s3,
        ...Typography.body,
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: Colors.surfaceContainer,
        marginVertical: Spacing.s1,
    }
});
