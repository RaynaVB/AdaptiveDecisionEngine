import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView, Modal, Platform } from 'react-native';
import { StorageService } from '../../src/services/storage';
import { Recommendation, FeedbackOutcome, FeedbackEvent } from '../../src/models/types';
import { FeedbackStorageService } from '../../src/services/feedbackStorage';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { ExperimentRun } from '../../src/models/healthlab';
import { Play, CheckCircle, AlertTriangle, Zap, Beaker, Menu, Bell, X, Settings, LogOut, ShieldCheck, Sparkles, Check, History } from 'lucide-react-native';
import { auth } from '../../src/services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { getUserProfile, UserProfile, isInternalUser } from '../../src/services/userProfile';
import { RecommendationService } from '../../src/services/recommendationService';
import { MICRO_DISCLAIMER_RECOMMENDATIONS } from '../constants/legal';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';
import { TopBar } from '../components/TopBar';
import { RecommendationCard } from '../components/RecommendationCard';

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

            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }

            const response = await RecommendationService.getRecommendations();
            const recs = response.recommendations;
            setGenerationId(response.generation.id);

            const filteredRecs = recs.filter((r: Recommendation) =>
                !r.associatedExperimentId ||
                !actives.some((run: ExperimentRun) => run.experimentId === r.associatedExperimentId)
            );

            const feedbackMap: Record<string, FeedbackOutcome | null> = {};
            for (const rec of recs) {
                feedbackMap[rec.id] = rec.action?.state === 'none' ? null : (rec.action?.state as FeedbackOutcome);
            }

            const sortedRecs = [...filteredRecs].sort((a, b) => {
                const aActed = feedbackMap[a.id] !== null;
                const bActed = feedbackMap[b.id] !== null;
                if (aActed === bActed) return 0;
                return aActed ? 1 : -1;
            });

            setRecommendations(sortedRecs);
            setFeedbacks(feedbackMap);
        } catch (error) {
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

    const handleFeedback = async (rec: Recommendation, outcome: FeedbackOutcome) => {
        if (!generationId) return;
        try {
            await RecommendationService.submitAction(generationId, rec.id, outcome);
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

            setFeedbacks(prev => ({ ...prev, [rec.id]: outcome }));
        } catch (e) {
            console.error("Failed to sync action with backend", e);
            Alert.alert("Error", "Could not save your response. Please try again.");
        }
    };

    const renderCard = (rec: Recommendation, tier: RecTier) => {
        return (
            <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onAccept={(r) => handleFeedback(r, 'accepted')}
                onMaybe={(r) => handleFeedback(r, 'maybe')}
                onDismiss={(r) => handleFeedback(r, 'rejected')}
                actionState={feedbacks[rec.id]}
                isActed={feedbacks[rec.id] !== null}
            />
        );
    };

    const preventive = recommendations.filter(r => classifyTier(r) === 'preventive');
    const optimization = recommendations.filter(r => classifyTier(r) !== 'preventive');

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} />

            <TopBar userProfile={userProfile} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecommendations} />}
            >
                <View style={styles.pageHeader}>
                    <Text style={styles.pageLabel}>TODAY'S GUIDANCE</Text>
                    <Text style={styles.pageTitle}>Recommendations</Text>
                </View>

                {preventive.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>PREVENTIVE</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {preventive.map(rec => renderCard(rec, 'preventive'))}
                    </View>
                )}

                {optimization.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>OPTIMIZATION</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {optimization.map(rec => renderCard(rec, 'optimization'))}
                    </View>
                )}

                <Text style={styles.disclaimerText}>{MICRO_DISCLAIMER_RECOMMENDATIONS}</Text>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.s4,
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
        lineHeight: 40,
        color: Colors.onSurface,
    },
    section: {
        marginBottom: Spacing.s6,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.s4,
    },
    sectionLabel: {
        ...Typography.label,
        color: Colors.primary,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.surfaceContainer,
        marginLeft: Spacing.s4,
    },
    actionButtonLabel: {
        ...Typography.label,
        fontSize: 9,
        marginTop: 4,
        fontWeight: '800',
    },
    quoteCard: {
        marginVertical: 32,
        padding: 32,
        borderRadius: 32,
        backgroundColor: Colors.primaryMuted,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primaryContainer,
    },
    quoteText: {
        ...Typography.body,
        fontStyle: 'italic',
        textAlign: 'center',
        color: Colors.onSurface,
        marginBottom: 12,
        fontWeight: '500',
    },
    quoteSubtext: {
        ...Typography.label,
        fontSize: 10,
        color: Colors.onSurfaceVariant,
        fontWeight: '800',
    },
    disclaimerText: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.outline,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 16,
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
