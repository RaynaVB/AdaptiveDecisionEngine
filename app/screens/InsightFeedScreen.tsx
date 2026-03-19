import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { StorageService } from '../../src/services/storage';
import { Pattern, Insight } from '../../src/models/types';
import { generateInsightsFromPatterns } from '../../src/core/insight_engine/insightEngine';
import { useFocusEffect } from '@react-navigation/native';
import { Sparkles, Shield, TrendingUp, AlertTriangle, Activity } from 'lucide-react-native';
import { auth } from '../../src/services/firebaseConfig';
import { getUserProfile, UserProfile } from '../../src/services/userProfile';

export default function InsightFeedScreen() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const loadInsights = async () => {
        setLoading(true);
        try {
            // Fetch user profile for personalization
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }

            const meals = await StorageService.getMealEvents();
            const moods = await StorageService.getMoodEvents();
            const symptoms = await StorageService.getSymptomEvents();
            
            // Patterns are now server-side (using placeholder for now)
            const patterns: Pattern[] = []; 
            const generatedInsights = generateInsightsFromPatterns(patterns);
            
            // Sort insights by user goals relevance
            const sorted = sortByGoalRelevance(generatedInsights, userProfile);
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
                a.title.toLowerCase().includes(kw) || a.description.toLowerCase().includes(kw)
            ) ? 1 : 0;
            const bRelevance = userKeywords.some(kw => 
                b.title.toLowerCase().includes(kw) || b.description.toLowerCase().includes(kw)
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const renderInsightCard = (insight: Insight) => {
        const isPrediction = insight.type === 'prediction';
        const isTrigger = insight.type === 'correlation';
        const isProtective = insight.type === 'protective';
        
        const cardStyle = isPrediction ? styles.predictionCard 
            : isTrigger ? styles.triggerCard 
            : isProtective ? styles.protectiveCard 
            : null;
        
        const iconColor = isPrediction ? '#ef4444' 
            : isTrigger ? '#f59e0b' 
            : isProtective ? '#10b981' 
            : '#2563eb';

        const Icon = isPrediction ? AlertTriangle 
            : isTrigger ? Sparkles 
            : isProtective ? Shield 
            : TrendingUp;
        
        return (
            <View key={insight.id} style={[styles.card, cardStyle]}>
                <View style={styles.cardHeader}>
                    <Icon color={iconColor} size={20} />
                    <Text style={[styles.typeBadge, 
                        isPrediction && styles.predictionBadge,
                        isTrigger && styles.triggerBadge,
                        isProtective && styles.protectiveBadge
                    ]}>
                        {insight.type.toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.cardTitle}>{insight.title}</Text>
                <Text style={styles.cardDescription}>{insight.description}</Text>
                <View style={styles.footer}>
                    <Text style={styles.confidenceText}>Confidence: {insight.confidence}</Text>
                </View>
            </View>
        );
    };

    // Categorize insights into sections
    const triggers = insights.filter(i => i.type === 'correlation');
    const protectors = insights.filter(i => i.type === 'protective');
    const emerging = insights.filter(i => i.type === 'timing' || i.type === 'compound');
    const predictions = insights.filter(i => i.type === 'prediction');

    // Build sensitivity profile from user profile
    const sensitivityItems = [
        ...(userProfile?.sensitivities || []),
        ...(userProfile?.allergies || []),
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentParams} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInsights}/>}>
            
            {/* Sensitivity Profile Card */}
            {sensitivityItems.length > 0 && (
                <View style={styles.sensitivityCard}>
                    <View style={styles.sensitivityHeader}>
                        <Activity color="#6366f1" size={20} />
                        <Text style={styles.sensitivityTitle}>Your Sensitivity Profile</Text>
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
                        Insights are prioritized based on these sensitivities and your goals.
                    </Text>
                </View>
            )}

            {/* Predictions / Heads Up */}
            {predictions.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>🔮 PREDICTIONS</Text>
                    {predictions.map(renderInsightCard)}
                </View>
            )}

            {/* Top Triggers */}
            {triggers.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>🎯 TOP TRIGGERS</Text>
                    {triggers.map(renderInsightCard)}
                </View>
            )}

            {/* Top Protectors */}
            {protectors.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>🛡️ TOP PROTECTORS</Text>
                    {protectors.map(renderInsightCard)}
                </View>
            )}

            {/* Emerging Patterns */}
            {emerging.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>📊 EMERGING PATTERNS</Text>
                    {emerging.map(renderInsightCard)}
                </View>
            )}

            {insights.length === 0 && !loading && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No insights available yet. Keep logging!</Text>
                </View>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    contentParams: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionHeader: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 12, letterSpacing: 0.5 },
    card: {
        backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    },
    predictionCard: {
        borderColor: '#fca5a5', borderWidth: 2, backgroundColor: '#fef2f2'
    },
    triggerCard: {
        borderColor: '#fcd34d', borderWidth: 2, backgroundColor: '#fffbeb'
    },
    protectiveCard: {
        borderColor: '#6ee7b7', borderWidth: 2, backgroundColor: '#ecfdf5'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    typeBadge: { fontSize: 12, fontWeight: '700', color: '#2563eb', backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    predictionBadge: { color: '#991b1b', backgroundColor: '#fee2e2' },
    triggerBadge: { color: '#92400e', backgroundColor: '#fef3c7' },
    protectiveBadge: { color: '#065f46', backgroundColor: '#d1fae5' },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
    cardDescription: { fontSize: 15, color: '#4b5563', lineHeight: 22, marginBottom: 16 },
    footer: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, alignItems: 'flex-end' },
    confidenceText: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize', fontWeight: '500' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, color: '#9ca3af' },

    // Sensitivity Profile Card
    sensitivityCard: {
        backgroundColor: '#eef2ff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    sensitivityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    sensitivityTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#312e81',
    },
    sensitivityChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    sensitivityChip: {
        backgroundColor: '#c7d2fe',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    sensitivityChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4338ca',
        textTransform: 'capitalize',
    },
    sensitivitySubtext: {
        fontSize: 13,
        color: '#6366f1',
        fontStyle: 'italic',
    },
});
