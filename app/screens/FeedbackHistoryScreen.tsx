import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FeedbackStorageService } from '../../src/services/feedbackStorage';
import { FeedbackEvent } from '../../src/models/types';

export default function FeedbackHistoryScreen() {
    const [history, setHistory] = useState<FeedbackEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await FeedbackStorageService.getFeedbackHistory();
            // Sort localized descending (newest first)
            const sortedData = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setHistory(sortedData);
        } catch (error) {
            console.error('Error loading feedback history:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    const getOutcomeEmoji = (outcome: string) => {
        if (outcome === 'accepted_fully') return '✅ Adopted';
        if (outcome === 'accepted_partially') return '⚠️ Partially Accepted';
        if (outcome === 'rejected') return '❌ Rejected';
        return '❓ Unknown';
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (history.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>No feedback history found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                    <View style={styles.historyCard}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.typeLabel} numberOfLines={1}>
                                {item.recommendationType.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                            <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
                        </View>
                        {item.title && (
                            <Text style={styles.title}>{item.title}</Text>
                        )}
                        {item.action && (
                            <Text style={styles.actionText}>{item.action}</Text>
                        )}
                        <View style={styles.outcomeContainer}>
                            <Text style={styles.outcomeText}>{getOutcomeEmoji(item.outcome)}</Text>
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    historyCard: {
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7280',
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    actionText: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 12,
        lineHeight: 20,
    },
    date: {
        fontSize: 12,
        color: '#9ca3af',
    },
    outcomeContainer: {
        backgroundColor: '#f3f4f6',
        padding: 10,
        borderRadius: 8,
    },
    outcomeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
    }
});
