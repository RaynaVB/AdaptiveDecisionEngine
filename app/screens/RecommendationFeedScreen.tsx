import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { StorageService } from '../../src/services/storage';
import { Recommendation, FeedbackOutcome, FeedbackEvent } from '../../src/models/types';
import { FeedbackStorageService } from '../../src/services/feedbackStorage';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { ExperimentRun } from '../../src/models/healthlab';
import { Play, CheckCircle, AlertTriangle, Zap, Beaker } from 'lucide-react-native';
import { auth } from '../../src/services/firebaseConfig';
import { getUserProfile, UserProfile } from '../../src/services/userProfile';
import { RecommendationService } from '../../src/services/recommendationService';

type RecsScreenProp = StackNavigationProp<RootStackParamList, 'Recommendations'>;

// Tier classification for recommendations
type RecTier = 'preventive' | 'optimization' | 'experiment';

const classifyTier = (rec: Recommendation): RecTier => {
    if (rec.associatedExperimentId) return 'experiment';
    // Symptom-linked patterns are preventive (highest urgency)
    if (rec.category === 'symptom_prevention' || rec.type === 'prevention_plan') return 'preventive';
    // Everything else is optimization
    return 'optimization';
};

export default function RecommendationFeedScreen() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackOutcome | null>>({});
    const [activeExperiments, setActiveExperiments] = useState<ExperimentRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const loadRecommendations = async () => {
        setLoading(true);
        try {
            const actives = await ExperimentEngine.getActiveExperiments();
            setActiveExperiments(actives);

            // Fetch user profile for goal-based sorting
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }

            // 1. fetch recent meals, moods, AND symptoms from Firestore
            const meals = await StorageService.getMealEvents();
            const moods = await StorageService.getMoodEvents();
            const symptoms = await StorageService.getSymptomEvents();
            
            // 3. run Recommendation Engine (Remote)
            console.log("[Recommendations] Fetching from Cloud Function...");
            const response = await RecommendationService.getRecommendations();
            const recs = response.recommendations;
            setGenerationId(response.generation.id);
            console.log("[Recommendations] Success! Result count:", recs.length);
            
            // 4. render recommendations
            // Filter out recommendations that are already active experiments
            const filteredRecs = recs.filter((r: Recommendation) => 
                !r.associatedExperimentId || 
                !actives.some((run: ExperimentRun) => run.experimentId === r.associatedExperimentId)
            );
            
            const feedbackMap: Record<string, FeedbackOutcome | null> = {};
            for (const rec of recs) {
                // Using the specific recommendation's current action state if available from backend
                feedbackMap[rec.id] = rec.action.state === 'none' ? null : (rec.action.state as FeedbackOutcome);
            }

            // Global sort: unacted first
            const sortedRecs = [...filteredRecs].sort((a, b) => {
                const aActed = feedbackMap[a.id] !== null;
                const bActed = feedbackMap[b.id] !== null;
                if (aActed === bActed) return 0;
                return aActed ? 1 : -1;
            });

            setRecommendations(sortedRecs);
            setFeedbacks(feedbackMap);
        } catch(error) {
            console.error("Error loading recommendations:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRecommendations();
        }, [])
    );

    const navigation = useNavigation<RecsScreenProp>();

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity 
                    onPress={() => navigation.navigate('FeedbackHistory')}
                    style={{ marginRight: 16 }}
                >
                    <Text style={{ color: '#2563eb', fontSize: 16, fontWeight: '500' }}>History</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const handleFeedback = async (rec: Recommendation, outcome: FeedbackOutcome) => {
        if (!generationId) return;

        // Sync with backend
        try {
            await RecommendationService.submitAction(generationId, rec.id, outcome);
            
            // Also store locally for history if needed
            const event: FeedbackEvent = {
                id: uuidv4(),
                recommendationId: rec.id,
                recommendationType: rec.type,
                title: rec.title,
                action: rec.summary,
                outcome,
                timestamp: new Date().toISOString()
            };
            await FeedbackStorageService.saveFeedback(event);
        } catch (e) {
            console.error("Failed to sync action with backend", e);
            Alert.alert("Error", "Could not save your response. Please try again.");
            return;
        }
        
        setFeedbacks((prev: Record<string, FeedbackOutcome | null>) => ({
            ...prev,
            [rec.id]: outcome
        }));
    };

    const handleStartExperiment = async (experimentId: string) => {
        try {
            setLoading(true);
            await ExperimentEngine.startExperiment(experimentId);
            Alert.alert("Success", "Experiment started! You can track your progress on the home screen.");
            navigation.navigate('Timeline');
        } catch (e) {
            console.error("Failed to start experiment:", e);
            Alert.alert("Error", "Could not start experiment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderFeedbackButtons = (rec: Recommendation) => {
        const currentOutcome = feedbacks[rec.id];

        return (
            <View style={styles.feedbackContainer}>
                <TouchableOpacity 
                    style={[styles.feedbackButton, currentOutcome === 'accepted' && styles.feedbackButtonActive]}
                    onPress={() => handleFeedback(rec, 'accepted')}
                >
                    <Text style={styles.feedbackEmoji}>✅</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.feedbackButton, currentOutcome === 'maybe' && styles.feedbackButtonActive]}
                    onPress={() => handleFeedback(rec, 'maybe')}
                >
                    <Text style={styles.feedbackEmoji}>⚠️</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.feedbackButton, currentOutcome === 'rejected' && styles.feedbackButtonActive]}
                    onPress={() => handleFeedback(rec, 'rejected')}
                >
                    <Text style={styles.feedbackEmoji}>❌</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const getOutcomeText = (outcome: FeedbackOutcome | null) => {
        if (outcome === 'accepted') return 'Accepted';
        if (outcome === 'maybe') return 'Maybe';
        if (outcome === 'rejected') return 'Rejected';
        if (outcome === 'dismissed') return 'Dismissed';
        if (outcome === 'completed') return 'Completed';
        return 'None';
    };

    const getTierStyle = (tier: RecTier) => {
        switch (tier) {
            case 'preventive': return styles.preventiveCard;
            case 'experiment': return styles.experimentCard;
            default: return styles.optimizationCard;
        }
    };

    const renderCard = (rec: Recommendation, tier: RecTier) => {
        const isActed = feedbacks[rec.id] !== null;
        return (
            <View key={rec.id} style={[styles.card, getTierStyle(tier), isActed && styles.actedCard]}>
            <Text style={styles.cardTitle}>{rec.title}</Text>
            <Text style={styles.cardAction}>{rec.summary}</Text>
            <View style={styles.whyContainer}>
                <Text style={styles.whyLabel}>Why this?</Text>
                {rec.whyThis.map((reason, idx) => (
                    <Text key={idx} style={styles.whyText}>• {reason.label}</Text>
                ))}
            </View>
            
            {rec.associatedExperimentId && !activeExperiments.some(run => run.experimentId === rec.associatedExperimentId) && (
                <TouchableOpacity 
                    style={styles.experimentButton}
                    onPress={() => handleStartExperiment(rec.associatedExperimentId!)}
                >
                    <Play size={16} color="#fff" fill="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.experimentButtonText}>Start 5-Day Experiment</Text>
                </TouchableOpacity>
            )}

            {rec.associatedExperimentId && activeExperiments.some(run => run.experimentId === rec.associatedExperimentId) && (
                <View style={styles.activeExperimentTag}>
                    <CheckCircle size={14} color="#16a34a" style={{ marginRight: 6 }} />
                    <Text style={styles.activeExperimentText}>Running as Experiment</Text>
                </View>
            )}

            <View style={styles.outcomeRow}>
                {feedbacks[rec.id] && (
                    <Text style={styles.lastOutcomeText}>
                        Last outcome: {getOutcomeText(feedbacks[rec.id])}
                    </Text>
                )}
                {renderFeedbackButtons(rec)}
            </View>
        </View>
        );
    };

    // Classify recommendations into tiers
    const preventive = recommendations.filter(r => classifyTier(r) === 'preventive');
    const optimization = recommendations.filter(r => classifyTier(r) === 'optimization');
    const experiments = recommendations.filter(r => classifyTier(r) === 'experiment');

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentParams} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecommendations}/>}>
            
            {/* Tier 1: Preventive (highest urgency) */}
            {preventive.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.tierHeader}>
                        <AlertTriangle size={16} color="#dc2626" />
                        <Text style={[styles.sectionHeader, styles.preventiveHeader]}>🚨 PREVENTIVE</Text>
                    </View>
                    <Text style={styles.tierSubtext}>Based on your symptom patterns</Text>
                    {preventive.map(rec => renderCard(rec, 'preventive'))}
                </View>
            )}

            {/* Tier 2: Optimization */}
            {optimization.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.tierHeader}>
                        <Zap size={16} color="#f59e0b" />
                        <Text style={[styles.sectionHeader, styles.optimizationHeader]}>⚡ OPTIMIZATION</Text>
                    </View>
                    <Text style={styles.tierSubtext}>Improve your daily performance</Text>
                    {optimization.map(rec => renderCard(rec, 'optimization'))}
                </View>
            )}

            {/* Tier 3: Experiments */}
            {experiments.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.tierHeader}>
                        <Beaker size={16} color="#6366f1" />
                        <Text style={[styles.sectionHeader, styles.experimentHeader]}>🧪 EXPERIMENTS</Text>
                    </View>
                    <Text style={styles.tierSubtext}>Test and confirm your patterns</Text>
                    {experiments.map(rec => renderCard(rec, 'experiment'))}
                </View>
            )}

            {recommendations.length === 0 && !loading && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No recommendations available yet.</Text>
                </View>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    contentParams: {
        padding: 16,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    tierHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    tierSubtext: {
        fontSize: 13,
        color: '#9ca3af',
        marginBottom: 12,
        marginLeft: 24,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    preventiveHeader: {
        color: '#dc2626',
    },
    optimizationHeader: {
        color: '#d97706',
    },
    experimentHeader: {
        color: '#6366f1',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    preventiveCard: {
        borderColor: '#fca5a5',
        borderWidth: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#dc2626',
    },
    actedCard: {
        opacity: 0.6,
        backgroundColor: '#f9fafb',
    },
    optimizationCard: {
        borderColor: '#fcd34d',
        borderWidth: 1,
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
    },
    experimentCard: {
        borderColor: '#c4b5fd',
        borderWidth: 1,
        borderLeftWidth: 4,
        borderLeftColor: '#6366f1',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    cardAction: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 16,
        lineHeight: 22,
    },
    whyContainer: {
        backgroundColor: '#f3f4f6',
        padding: 12,
        borderRadius: 8,
    },
    whyLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    whyText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
    },
    outcomeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    lastOutcomeText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    feedbackContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    feedbackButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    feedbackButtonActive: {
        backgroundColor: '#dbeafe',
        borderColor: '#bfdbfe',
    },
    feedbackEmoji: {
        fontSize: 16,
    },
    experimentButton: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    experimentButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    activeExperimentTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    activeExperimentText: {
        color: '#166534',
        fontSize: 13,
        fontWeight: '600',
    }
});
