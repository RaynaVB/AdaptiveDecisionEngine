// app/screens/HealthLabScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, Play, ChevronRight, History, Sparkles } from 'lucide-react-native';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { ExperimentRun, ExperimentDefinition } from '../../src/models/healthlab';
import { StorageService } from '../../src/services/storage';
import { auth } from '../../src/services/firebaseConfig';
import { getUserProfile, isInternalUser, UserProfile } from '../../src/services/userProfile';

type HealthLabScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'HealthLab'>;
};

// Relevance scoring: maps user profile data to experiment relevance
interface ScoredExperiment {
    experiment: ExperimentDefinition;
    score: number;
    reason: string;
}

const scoreExperiment = (exp: ExperimentDefinition, profile: UserProfile | null): ScoredExperiment => {
    let score = 0;
    const reasons: string[] = [];

    if (!profile) return { experiment: exp, score: 0, reason: '' };

    // Match by user symptoms
    const userSymptoms = profile.symptoms || [];
    const symptomKeywords: Record<string, string[]> = {
        'bloating': ['dairy', 'digestion', 'bloating'],
        'gas': ['dairy', 'digestion', 'fodmap'],
        'stomach_pain': ['dairy', 'digestion'],
        'acid_reflux': ['late', 'snack'],
        'fatigue': ['energy', 'protein', 'afternoon', 'hydration'],
        'energy_crashes': ['energy', 'protein', 'snack', 'afternoon'],
        'brain_fog': ['brain fog', 'hydration', 'caffeine'],
        'mood_swings': ['mood', 'stress'],
        'anxiety': ['stress', 'mood'],
        'headaches': ['hydration', 'caffeine'],
        'sleep_problems': ['late', 'snack', 'caffeine'],
    };

    for (const symptom of userSymptoms) {
        const keywords = symptomKeywords[symptom] || [];
        for (const kw of keywords) {
            if (
                exp.hypothesis.toLowerCase().includes(kw) ||
                exp.name.toLowerCase().includes(kw) ||
                exp.targetMetric.toLowerCase().includes(kw)
            ) {
                score += 3;
                reasons.push(symptom.replace(/_/g, ' '));
                break; // count each symptom once
            }
        }
    }

    // Match by user sensitivities
    const userSensitivities = profile.sensitivities || [];
    const sensitivityKeywords: Record<string, string[]> = {
        'lactose_sensitive': ['dairy'],
        'caffeine_sensitive': ['caffeine'],
        'sugar_sensitive': ['sugar', 'blood sugar'],
        'spicy_food_sensitive': ['spicy'],
        'high_fodmap_sensitive': ['fodmap', 'digestion'],
        'fried_oily_food_sensitive': ['fried'],
    };

    for (const sens of userSensitivities) {
        const keywords = sensitivityKeywords[sens] || [];
        for (const kw of keywords) {
            if (exp.hypothesis.toLowerCase().includes(kw) || exp.name.toLowerCase().includes(kw)) {
                score += 2;
                reasons.push(sens.replace(/_/g, ' ').replace('sensitive', '').trim());
                break;
            }
        }
    }

    // Match by goals
    const userGoals = profile.goals || [];
    const goalKeywords: Record<string, string[]> = {
        'improve_energy': ['energy', 'afternoon', 'protein'],
        'improve_digestion': ['digestion', 'bloating', 'dairy'],
        'improve_mood_clarity': ['mood', 'brain fog', 'stress'],
        'identify_food_triggers': ['symptom', 'dairy', 'elimination'],
        'build_healthier_habits': ['hydration', 'routine'],
    };

    for (const goal of userGoals) {
        const keywords = goalKeywords[goal] || [];
        for (const kw of keywords) {
            if (exp.hypothesis.toLowerCase().includes(kw) || exp.targetMetric.toLowerCase().includes(kw)) {
                score += 1;
                break;
            }
        }
    }

    // Build reason string
    const uniqueReasons = [...new Set(reasons)];
    const reason = uniqueReasons.length > 0 
        ? `Based on your ${uniqueReasons.slice(0, 2).join(' + ')}`
        : '';

    return { experiment: exp, score, reason };
};

export default function HealthLabScreen({ navigation }: HealthLabScreenProps) {
    const [loading, setLoading] = useState(true);
    const [activeExperiments, setActiveExperiments] = useState<ExperimentRun[]>([]);
    const [availableExperiments, setAvailableExperiments] = useState<ExperimentDefinition[]>(EXPERIMENT_LIBRARY);
    const [recommendedExperiments, setRecommendedExperiments] = useState<ScoredExperiment[]>([]);
    const [hasRecentSymptoms, setHasRecentSymptoms] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const [actives, history, recentSymptoms] = await Promise.all([
                ExperimentEngine.getActiveExperiments(),
                ExperimentEngine.getExperimentRuns(),
                StorageService.getSymptomEvents()
            ]);
            
            let profile: UserProfile | null = null;
            if (auth.currentUser) {
                profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }

            setActiveExperiments(actives);
            setHasRecentSymptoms(recentSymptoms.length > 0);

            // Filter out experiments that have been completed with High/Medium confidence
            const excludedIds = history
                .filter(run => run.status === 'completed' && (run.confidenceScore === 'high' || run.confidenceScore === 'medium'))
                .map(run => run.experimentId);

            // Also exclude currently active experiments from the available list
            const activeIds = actives.map(run => run.experimentId);

            const filtered = EXPERIMENT_LIBRARY.filter(def => 
                !excludedIds.includes(def.id) && !activeIds.includes(def.id)
            );

            // Score all experiments for personalization
            const scored = filtered.map(exp => scoreExperiment(exp, profile));
            
            // Split into recommended (score > 0) and rest
            const recommended = scored
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            
            const recommendedIds = new Set(recommended.map(r => r.experiment.id));
            const remaining = filtered.filter(exp => !recommendedIds.has(exp.id));

            setRecommendedExperiments(recommended);
            setAvailableExperiments(remaining);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderRecommendedCard = (scored: ScoredExperiment) => {
        const { experiment: item, reason } = scored;
        const isActive = activeExperiments.some(run => run.experimentId === item.id);

        return (
            <TouchableOpacity 
                key={item.id}
                style={styles.recommendedCard}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.id })}
            >
                <View style={styles.recommendedContent}>
                    <View style={styles.recommendedIconContainer}>
                        <Sparkles size={22} color="#f59e0b" />
                    </View>
                    <View style={styles.recommendedTextContainer}>
                        <Text style={styles.recommendedTitle}>{item.name}</Text>
                        <Text style={styles.recommendedHypothesis} numberOfLines={2}>{item.hypothesis}</Text>
                        <View style={styles.recommendedFooter}>
                            <Text style={styles.durationTag}>{item.durationDays} Days</Text>
                            {reason ? (
                                <Text style={styles.reasonTag}>{reason}</Text>
                            ) : null}
                        </View>
                    </View>
                    <ChevronRight size={20} color="#f59e0b" />
                </View>
            </TouchableOpacity>
        );
    };

    const renderExperimentItem = ({ item }: { item: ExperimentDefinition }) => {
        const isActive = activeExperiments.some(run => run.experimentId === item.id);

        return (
            <TouchableOpacity 
                style={[styles.card, isActive && styles.activeCard]}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.id })}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: isActive ? '#dbeafe' : '#f3f4f6' }]}>
                        <Beaker size={20} color={isActive ? '#2563eb' : '#6b7280'} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardHypothesis} numberOfLines={2}>{item.hypothesis}</Text>
                        <View style={styles.cardFooter}>
                            <Text style={styles.durationTag}>{item.durationDays} Days</Text>
                            <Text style={styles.categoryTag}>{item.category}</Text>
                        </View>
                    </View>
                    {isActive ? (
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                    ) : (
                        <ChevronRight size={20} color="#9ca3af" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const handleSimulateTest = async () => {
        setLoading(true);
        try {
            const runId = await ExperimentEngine.seedManualTestExperiment();
            navigation.navigate('ExperimentResult', { runId });
        } catch (e) {
            alert("Simulation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>HealthLab</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ExperimentHistory')} style={styles.historyButton}>
                    <History size={24} color="#2563eb" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {isInternalUser(userProfile) && (
                        <View style={styles.debugSection}>
                            <TouchableOpacity style={styles.debugButton} onPress={handleSimulateTest}>
                                <Beaker size={18} color="#2563eb" style={{ marginRight: 8 }} />
                                <Text style={styles.debugButtonText}>Simulate Full 7-Day Study Result</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeExperiments.length > 0 && (
                        <View style={styles.activeSection}>
                            <Text style={styles.sectionTitle}>Active Experiments</Text>
                            {activeExperiments.map(activeRun => (
                                <TouchableOpacity 
                                    key={activeRun.id}
                                    style={[styles.activeHighlightCard, { marginBottom: 16 }]}
                                    onPress={() => navigation.navigate('ExperimentDetail', { experimentId: activeRun.experimentId })}
                                >
                                    <View style={styles.activeHeader}>
                                        <View style={styles.activeIconContainer}>
                                            <Play size={24} color="#fff" fill="#fff" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.activeTitle}>
                                                {EXPERIMENT_LIBRARY.find(e => e.id === activeRun.experimentId)?.name || 'Unknown Experiment'}
                                            </Text>
                                            <Text style={styles.activeSub}>Track your progress daily</Text>
                                        </View>
                                        <ChevronRight size={24} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Recommended For You section */}
                    {recommendedExperiments.length > 0 && (
                        <View style={styles.recommendedSection}>
                            <Text style={styles.sectionTitle}>✨ Recommended For You</Text>
                            <Text style={styles.recommendedSubtitle}>Based on your symptoms, sensitivities, and goals</Text>
                            {recommendedExperiments.map(renderRecommendedCard)}
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>Available Experiments</Text>
                    <FlatList
                        data={availableExperiments}
                        renderItem={renderExperimentItem}
                        keyExtractor={item => item.id}
                        scrollEnabled={false}
                    />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        marginRight: 12,
    },
    historyButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        marginLeft: 'auto',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 16,
        marginTop: 12,
        letterSpacing: -0.4,
    },
    activeSection: {
        marginBottom: 12,
    },
    activeHighlightCard: {
        backgroundColor: '#2563eb',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    activeTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    activeSub: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 15,
        fontWeight: '500',
        marginTop: 4,
    },

    // Recommended For You section
    recommendedSection: {
        marginBottom: 24,
    },
    recommendedSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: -8,
        marginBottom: 16,
    },
    recommendedCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 18,
        marginBottom: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#fcd34d',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    recommendedContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recommendedIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    recommendedTextContainer: {
        flex: 1,
    },
    recommendedTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#92400e',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    recommendedHypothesis: {
        fontSize: 14,
        color: '#78716c',
        lineHeight: 20,
        fontWeight: '400',
    },
    recommendedFooter: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    reasonTag: {
        fontSize: 12,
        color: '#92400e',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '600',
        fontStyle: 'italic',
    },

    // Regular experiment cards
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        marginBottom: 16,
        padding: 20,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    activeCard: {
        borderColor: '#bfdbfe',
        backgroundColor: '#f0f7ff',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    cardHypothesis: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
        fontWeight: '400',
    },
    cardFooter: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    durationTag: {
        fontSize: 12,
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '700',
    },
    categoryTag: {
        fontSize: 12,
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    activeBadge: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    activeBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    debugSection: {
        marginBottom: 20,
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    debugButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    debugButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2563eb',
    },
});
