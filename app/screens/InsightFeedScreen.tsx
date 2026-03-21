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

    const renderInsightCard = (insight: Insight) => {
        const isPrediction = insight.type === 'prediction';
        const isTrigger = insight.type === 'correlation' || insight.type === 'trigger_pattern' || insight.type === 'mood_trigger';
        const isProtective = insight.type === 'protective';
        
        let iconColor = Colors.primary;
        let badgeBg = Colors.surfaceContainerLow;
        let badgeColor = Colors.onSurfaceVariant;

        if (isPrediction) {
            iconColor = '#ef4444';
            badgeBg = '#fee2e2';
            badgeColor = '#991b1b';
        } else if (isTrigger) {
            iconColor = '#f59e0b';
            badgeBg = '#fef3c7';
            badgeColor = '#92400e';
        } else if (isProtective) {
            iconColor = '#10b981';
            badgeBg = '#d1fae5';
            badgeColor = '#065f46';
        }

        const Icon = isPrediction ? AlertTriangle 
            : isTrigger ? Sparkles 
            : isProtective ? Shield 
            : TrendingUp;
        
        return (
            <View key={insight.id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <Icon color={iconColor} size={20} />
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.typeBadgeText, { color: badgeColor }]}>
                            {insight.type.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.cardTitle}>{insight.title}</Text>
                <Text style={styles.cardDescription}>{insight.summary}</Text>
                <View style={styles.footer}>
                    <Text style={styles.confidenceText}>
                        CONFIDENCE: {insight.confidenceLevel.toUpperCase()}
                    </Text>
                </View>
            </View>
        );
    };

    const triggers = insights.filter(i => i.type === 'trigger_pattern' || i.type === 'mood_trigger' || i.type === 'correlation');
    const protectors = insights.filter(i => i.type === 'protective');
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
                                        {item.replace(/_/g, ' ').replace(/sensitive|allergy/g, '').trim()}
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
                        {predictions.map(renderInsightCard)}
                    </View>
                )}

                {triggers.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>TRIGGERS</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {triggers.map(renderInsightCard)}
                    </View>
                )}

                {protectors.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>PROTECTORS</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {protectors.map(renderInsightCard)}
                    </View>
                )}

                {emerging.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionLabel}>EMERGING</Text>
                            <View style={styles.sectionLine} />
                        </View>
                        {emerging.map(renderInsightCard)}
                    </View>
                )}

                {insights.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <Sparkles size={48} color={Colors.surfaceContainer} style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyText}>Analyzing your data for patterns...</Text>
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
        borderColor: 'rgba(0,0,0,0.02)',
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
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        borderRadius: Radii.lg,
        padding: 24,
        marginBottom: Spacing.s6,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.1)',
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
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
        paddingVertical: 80,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        color: Colors.outline,
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
