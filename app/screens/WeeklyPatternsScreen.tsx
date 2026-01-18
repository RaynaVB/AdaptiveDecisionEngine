import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { StorageService } from '../../src/services/storage';
import { MealEvent, MoodEvent } from '../../src/models/types';
import { runPatternEngine, Pattern } from '../../src/core/pattern_engine';
import { ArrowLeft } from 'lucide-react-native';

type WeeklyPatternsScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'WeeklyPatterns'>;
};

export default function WeeklyPatternsScreen({ navigation }: WeeklyPatternsScreenProps) {
    const [loading, setLoading] = useState(true);
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadPatterns();
    }, []);

    const loadPatterns = async () => {
        try {
            setLoading(true);
            const meals = await StorageService.getMealEvents();
            const moods = await StorageService.getMoodEvents();

            // Uncertainty Policy: Global Thresholds
            // Min 5 meals, Min 3 moods (Last 7 Days) to even run the engine
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentMeals = meals.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);
            const recentMoods = moods.filter(m => new Date(m.occurredAt) >= sevenDaysAgo);

            if (recentMeals.length < 5) {
                setMessage("Not enough meal data yet. Log at least 5 meals this week to see patterns.");
                setPatterns([]);
                setLoading(false);
                return;
            }

            // Note: P2 (Late Night) and P3 (Shift) might not strict moods, but let's stick to policy
            // If strictly P2/P3 don't need moods, we could allow them.
            // Policy says: "Minimum Moods: 3". Strict adherence.
            if (recentMoods.length < 3) {
                setMessage("Not enough mood data yet. Log at least 3 moods this week to see patterns.");
                setPatterns([]);
                setLoading(false);
                return;
            }

            const results = runPatternEngine(meals, moods);

            // Sort: Severity (high->low) -> Confidence (high->low)
            const severityScore = (p: Pattern) => p.severity === 'high' ? 3 : p.severity === 'medium' ? 2 : 1;
            const confidenceScore = (p: Pattern) => p.confidence === 'high' ? 3 : p.confidence === 'medium' ? 2 : 1;

            results.sort((a, b) => {
                const sDiff = severityScore(b) - severityScore(a);
                if (sDiff !== 0) return sDiff;
                return confidenceScore(b) - confidenceScore(a);
            });

            // Take top 3
            setPatterns(results.slice(0, 3));
            setMessage(results.length === 0 ? "No patterns detected yet. Keep logging!" : "");

        } catch (e) {
            console.error(e);
            setMessage("Failed to load patterns.");
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceColor = (c: string) => {
        switch (c) {
            case 'high': return '#059669'; // Emerald 600
            case 'medium': return '#d97706'; // Amber 600
            default: return '#6b7280'; // Gray 500
        }
    };

    const getConfidenceBadge = (c: string) => {
        return (
            <View style={[styles.badge, { backgroundColor: getConfidenceColor(c) + '20' }]}>
                <Text style={[styles.badgeText, { color: getConfidenceColor(c) }]}>
                    {c.toUpperCase()} CONFIDENCE
                </Text>
            </View>
        );
    };

    const getSegmentationText = (seg?: Pattern['segmentation']) => {
        if (!seg) return null;
        const parts = [];
        if (seg.dayType && seg.dayType !== 'mixed') {
            parts.push(seg.dayType === 'weekday' ? 'Weekdays' : 'Weekends');
        }
        if (seg.timeOfDay && seg.timeOfDay !== 'mixed') {
            parts.push(seg.timeOfDay.replace('_', ' '));
        }
        if (parts.length === 0) return null;
        return `Mostly: ${parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Weekly Patterns</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {patterns.length > 0 ? (
                        <>
                            <Text style={styles.subtitle}>Top patterns from the last 7 days</Text>
                            {patterns.map(pattern => (
                                <View key={pattern.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        {getConfidenceBadge(pattern.confidence)}
                                    </View>
                                    <Text style={styles.cardTitle}>{pattern.title}</Text>
                                    <Text style={styles.cardDesc}>{pattern.description}</Text>

                                    {getSegmentationText(pattern.segmentation) && (
                                        <Text style={styles.segmentation}>
                                            {getSegmentationText(pattern.segmentation)}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>{message}</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 8,
    },
    segmentation: {
        fontSize: 13,
        color: '#4b5563',
        fontWeight: '500',
        marginTop: 8,
        fontStyle: 'italic',
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
});
