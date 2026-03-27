import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, SafeAreaView } from 'react-native';
import { StorageService } from '../../src/services/storage';
import { Insight } from '../../src/models/types';
import { InsightService } from '../../src/services/insightService';
import { useFocusEffect } from '@react-navigation/native';
import { Sparkles, Shield, TrendingUp, AlertTriangle, Activity } from 'lucide-react-native';
import { auth } from '../../src/services/firebaseConfig';
import { getUserProfile, UserProfile } from '../../src/services/userProfile';
import { MICRO_DISCLAIMER_INSIGHTS } from '../constants/legal';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';
import { TopBar } from '../components/TopBar';
import { InsightCard } from '../components/InsightCard';

export default function InsightFeedScreen() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const loadInsights = async () => {
        setLoading(true);
        try {
            let profile = userProfile;
            if (auth.currentUser && !profile) {
                profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }

            const response = await InsightService.getInsights();
            const generatedInsights = response.insights;
            
            const sorted = sortByGoalRelevance(generatedInsights, profile);
            setInsights(sorted);
        } catch(error) {
            console.error("Error loading insights:", error);
        } finally {
            setLoading(false);
        }
    };

    const sortByGoalRelevance = (insights: Insight[], profile: UserProfile | null): Insight[] => {
        if (!profile?.goals || profile.goals.length === 0) return insights;
        
        const goalKeywords: Record<string, string[]> = {
            'improve_energy': ['energy', 'fatigue', 'crash', 'afternoon'],
            'improve_digestion': ['bloating', 'digestive', 'stomach', 'gas', 'reflux'],
            'improve_mood_clarity': ['mood', 'brain fog', 'clarity', 'anxiety', 'irritability'],
            'improve_sleep': ['sleep', 'evening', 'bedtime', 'night', 'rest', 'insomnia'],
            'identify_food_triggers': ['trigger', 'correlation', 'symptom'],
            'understand_food_body_connection': ['correlation', 'pattern', 'association'],
            'build_healthier_habits': ['habit', 'timing', 'routine'],
        };

        const userKeywords = profile.goals.flatMap(g => goalKeywords[g] || []);
        if (userKeywords.length === 0) return insights;

        return [...insights].sort((a, b) => {
            const aRelevance = userKeywords.some(kw => 
                a.title.toLowerCase().includes(kw) || a.summary.toLowerCase().includes(kw)
            ) ? 1 : 0;
            const bRelevance = userKeywords.some(kw => 
                b.title.toLowerCase().includes(kw) || b.summary.toLowerCase().includes(kw)
            ) ? 1 : 0;
            return bRelevance - aRelevance;
        });
    };

    useFocusEffect(
        useCallback(() => {
            loadInsights();
        }, [])
    );

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }



    const triggers = insights.filter(i =>
        i.type === 'trigger_pattern' || i.type === 'mood_trigger' || i.type === 'correlation' ||
        i.type === 'energy_dip' || i.type === 'sleep_impact'
    );
    const protectors = insights.filter(i => i.type === 'protective' || i.type === 'mood_boost');
    const emerging = insights.filter(i => i.type === 'timing_pattern' || i.type === 'behavior_shift' || i.type === 'mood_association');
    const predictions = insights.filter(i => i.type === 'prediction');

    const sensitivityItems = [
        ...(userProfile?.sensitivities || []),
        ...(userProfile?.allergies || []),
    ];

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} />
            
            <TopBar userProfile={userProfile} />

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInsights}/>}
            >
                <View style={styles.pageHeader}>
                    <Text style={styles.pageLabel}>AI ANALYSIS</Text>
                    <Text style={styles.pageTitle}>Health Insights</Text>
                </View>

                {sensitivityItems.length > 0 && (
                    <View style={styles.sensitivityCard}>
                        <View style={styles.sensitivityHeader}>
                            <Activity color={Colors.primary} size={20} />
                            <Text style={styles.sensitivityTitle}>Sensitivity Profile</Text>
                        </View>
                        <View style={styles.sensitivityChips}>
                            {sensitivityItems.map(item => (
                                <View key={item} style={styles.sensitivityChip}>
                                    <Text style={styles.sensitivityChipText}>
                                        {(item || 'item').replace(/_/g, ' ').replace(/sensitive|allergy/g, '').trim()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.sensitivitySubtext}>
                            Insights prioritized for your body's profile.
                        </Text>
                    </View>
                )}

                {predictions.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>PREDICTIONS</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {predictions.map(i => <InsightCard key={i.id} insight={i} />)}
                    </View>
                )}

                {triggers.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>TRIGGERS</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {triggers.map(i => <InsightCard key={i.id} insight={i} />)}
                    </View>
                )}

                {protectors.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>PROTECTORS</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {protectors.map(i => <InsightCard key={i.id} insight={i} />)}
                    </View>
                )}

                {emerging.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>EMERGING</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {emerging.map(i => <InsightCard key={i.id} insight={i} />)}
                    </View>
                )}

                {insights.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                             <Sparkles size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Your AI is Learning</Text>
                        <Text style={styles.emptyText}>
                            Log your meals and symptoms for a few more days to unlock specialized health insights and predictions.
                        </Text>
                        <View style={styles.emptyHint}>
                            <Activity size={16} color={Colors.accent} />
                            <Text style={styles.emptyHintText}>Next milestone: 5 logs</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.disclaimerText}>{MICRO_DISCLAIMER_INSIGHTS}</Text>
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
        paddingHorizontal: Spacing.s6,
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
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.surfaceContainer,
        marginLeft: Spacing.s4,
    },
    card: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.xl,
        padding: 24,
        marginBottom: Spacing.s4,
        ...Shadows.ambient,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    typeBadgeText: {
        ...Typography.label,
        fontSize: 10,
        fontWeight: '800',
    },
    cardTitle: {
        ...Typography.title,
        fontSize: 18,
        marginBottom: 8,
        color: Colors.onSurface,
    },
    cardDescription: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurfaceVariant,
        lineHeight: 22,
        marginBottom: 20,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainer,
        paddingTop: 12,
    },
    confidenceText: {
        ...Typography.label,
        fontSize: 10,
        color: Colors.outline,
        fontWeight: '700',
    },
    sensitivityCard: {
        backgroundColor: Colors.accentContainer,
        borderRadius: Radii.lg,
        padding: 24,
        marginBottom: Spacing.s6,
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    sensitivityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    sensitivityTitle: {
        ...Typography.title,
        fontSize: 16,
        color: Colors.primary,
    },
    sensitivityChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    sensitivityChip: {
        backgroundColor: Colors.accent,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    sensitivityChipText: {
        ...Typography.label,
        color: Colors.primary,
        fontSize: 12,
        textTransform: 'capitalize',
    },
    sensitivitySubtext: {
        ...Typography.body,
        fontSize: 12,
        color: Colors.primary,
        fontStyle: 'italic',
        opacity: 0.8,
    },
    emptyState: {
        paddingVertical: 100,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        ...Typography.title,
        color: Colors.onSurface,
        marginBottom: 12,
    },
    emptyText: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    emptyHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.surfaceContainerLow,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: Radii.full,
    },
    emptyHintText: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.accent,
        textTransform: 'none',
        fontWeight: '700',
    },
    disclaimerText: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.outline,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 16,
    },
});
