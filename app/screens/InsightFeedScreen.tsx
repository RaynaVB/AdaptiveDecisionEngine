import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { StorageService } from '../../src/services/storage';
import { runPatternEngine } from '../../src/core/pattern_engine/patternEngine';
import { generateInsightsFromPatterns, Insight } from '../../src/core/insight_engine/insightEngine';
import { useFocusEffect } from '@react-navigation/native';
import { Sparkles } from 'lucide-react-native';

export default function InsightFeedScreen() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);

    const loadInsights = async () => {
        setLoading(true);
        try {
            const meals = await StorageService.getMealEvents();
            const moods = await StorageService.getMoodEvents();
            const symptoms = await StorageService.getSymptomEvents();
            
            const patterns = runPatternEngine(meals, moods, symptoms);
            const generatedInsights = generateInsightsFromPatterns(patterns);
            
            setInsights(generatedInsights);
        } catch(error) {
            console.error("Error loading insights:", error);
        } finally {
            setLoading(false);
        }
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
        
        return (
            <View key={insight.id} style={[styles.card, isPrediction && styles.predictionCard]}>
                <View style={styles.cardHeader}>
                    <Sparkles color={isPrediction ? "#ef4444" : "#2563eb"} size={20} />
                    <Text style={[styles.typeBadge, isPrediction && styles.predictionBadge]}>
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

    const predictions = insights.filter(i => i.type === 'prediction');
    const regularInsights = insights.filter(i => i.type !== 'prediction');

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentParams} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInsights}/>}>
            
            {predictions.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>HEADS UP WARNINGS</Text>
                    {predictions.map(renderInsightCard)}
                </View>
            )}

            {regularInsights.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>AI OBSERVATIONS</Text>
                    {regularInsights.map(renderInsightCard)}
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
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    typeBadge: { fontSize: 12, fontWeight: '700', color: '#2563eb', backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    predictionBadge: { color: '#991b1b', backgroundColor: '#fee2e2' },
    cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
    cardDescription: { fontSize: 15, color: '#4b5563', lineHeight: 22, marginBottom: 16 },
    footer: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, alignItems: 'flex-end' },
    confidenceText: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize', fontWeight: '500' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, color: '#9ca3af' },
});
