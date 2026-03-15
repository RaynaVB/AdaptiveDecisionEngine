import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { StorageService } from '../../src/services/storage';
import { runPatternEngine } from '../../src/core/pattern_engine/patternEngine';
import { runRecommendationEngine } from '../../src/core/recommender_engine/recommenderEngine';
import { Recommendation } from '../../src/core/recommender_engine/types';
import { FeedbackStorageService } from '../../src/services/feedbackStorage';
import { FeedbackOutcome, FeedbackEvent } from '../../src/models/types';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { ExperimentRun } from '../../src/models/healthlab';
import { Play, CheckCircle } from 'lucide-react-native';

type RecsScreenProp = StackNavigationProp<RootStackParamList, 'Recommendations'>;

export default function RecommendationFeedScreen() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackOutcome | null>>({});
    const [activeExperiments, setActiveExperiments] = useState<ExperimentRun[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRecommendations = async () => {
        setLoading(true);
        try {
            const actives = await ExperimentEngine.getActiveExperiments();
            setActiveExperiments(actives);

            // 1. fetch recent meals and moods from Firestore
            const meals = await StorageService.getMealEvents();
            const moods = await StorageService.getMoodEvents();
            
            // 2. run Pattern Engine
            const patterns = runPatternEngine(meals, moods);
            
            // 3. run Recommendation Engine
            const recs = await runRecommendationEngine(patterns, { meals, moods });
            
            // Part 7 - Debug Logging
            console.log("--- DEBUG: Recommendation Engine ---");
            console.log("Patterns detected:", patterns.length, patterns.map(p => p.title));
            console.log("Top 3 recommendations:", recs.map(r => ({
                title: r.title,
                totalScore: r.scores.total.toFixed(2)
            })));
            
            // 4. render recommendations
            // Filter out recommendations that are already active experiments
            const filteredRecs = recs.filter((r: Recommendation) => 
                !r.associatedExperimentId || 
                !actives.some((run: ExperimentRun) => run.experimentId === r.associatedExperimentId)
            );
            setRecommendations(filteredRecs);

            const feedbackMap: Record<string, FeedbackOutcome | null> = {};
            for (const rec of recs) {
                const outcome = await FeedbackStorageService.getLatestOutcomeForRecommendation(rec.templateId);
                feedbackMap[rec.id] = outcome;
            }
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
        const event: FeedbackEvent = {
            id: uuidv4(),
            recommendationId: rec.templateId,
            recommendationType: rec.recommendationType,
            title: rec.title,
            action: rec.action,
            outcome,
            timestamp: new Date().toISOString()
        };
        await FeedbackStorageService.saveFeedback(event);
        
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
                    style={[styles.feedbackButton, currentOutcome === 'accepted_fully' && styles.feedbackButtonActive]}
                    onPress={() => handleFeedback(rec, 'accepted_fully')}
                >
                    <Text style={styles.feedbackEmoji}>✅</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.feedbackButton, currentOutcome === 'accepted_partially' && styles.feedbackButtonActive]}
                    onPress={() => handleFeedback(rec, 'accepted_partially')}
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
        if (outcome === 'accepted_fully') return 'Accepted';
        if (outcome === 'accepted_partially') return 'Maybe';
        if (outcome === 'rejected') return 'Rejected';
        return 'None';
    };

    const renderCard = (rec: Recommendation, isBest: boolean) => (
        <View key={rec.id} style={[styles.card, isBest ? styles.bestCard : styles.altCard]}>
            <Text style={styles.cardTitle}>{rec.title}</Text>
            <Text style={styles.cardAction}>{rec.action}</Text>
            <View style={styles.whyContainer}>
                <Text style={styles.whyLabel}>Why this?</Text>
                <Text style={styles.whyText}>{rec.whyThis}</Text>
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

    const bestAction = recommendations[0];
    const alternates = recommendations.slice(1, 3);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentParams} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecommendations}/>}>
            
            {bestAction && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>BEST NEXT ACTION</Text>
                    {renderCard(bestAction, true)}
                </View>
            )}

            {alternates.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>ALTERNATIVE OPTIONS</Text>
                    {alternates.map(rec => renderCard(rec, false))}
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
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6b7280',
        marginBottom: 12,
        letterSpacing: 0.5,
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
    bestCard: {
        borderColor: '#bfdbfe',
        borderWidth: 2,
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    altCard: {
        opacity: 0.95,
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
