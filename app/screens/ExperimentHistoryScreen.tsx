import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, ChevronRight, XCircle, CheckCircle, ChevronLeft } from 'lucide-react-native';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { ExperimentRun } from '../../src/models/healthlab';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

type ExperimentHistoryScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'ExperimentHistory'>;
};

export default function ExperimentHistoryScreen({ navigation }: ExperimentHistoryScreenProps) {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<ExperimentRun[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const runs = await ExperimentEngine.getExperimentRuns();
            setHistory(runs.filter(r => r.status !== 'active'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderRunItem = ({ item }: { item: ExperimentRun }) => {
        const definition = EXPERIMENT_LIBRARY.find(e => e.id === item.id);
        const isCompleted = item.status === 'completed';

        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.id })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: isCompleted ? Colors.primarySubtle : Colors.errorContainer }]}>
                        {isCompleted ? <CheckCircle size={14} color={Colors.primary} /> : <XCircle size={14} color={Colors.error} />}
                        <Text style={[styles.statusText, { color: isCompleted ? Colors.primary : Colors.error }]}>
                            {(item.status || 'unknown').toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>{item.startDate ? new Date(item.startDate).toLocaleDateString() : 'Recent'}</Text>
                </View>

                <Text style={styles.cardTitle}>{definition?.name || 'Unknown Experiment'}</Text>
                
                {isCompleted && item.resultDelta !== undefined && (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultValue}>
                            {item.resultDelta > 0 ? '+' : ''}{Math.round(item.resultDelta)}% 
                        </Text>
                        <Text style={styles.resultLabel}>Impact on {(definition?.targetMetric || 'metric').replace(/_/g, ' ')}</Text>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <Text style={styles.confidenceText}>Confidence: {item.confidenceScore || 'N/A'}</Text>
                    <ChevronRight size={18} color={Colors.onSurfaceVariant} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} />
            
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('HealthLab');
                        }
                    }} 
                    style={styles.backButton}
                >
                    <ChevronLeft size={24} color={Colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>History</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderRunItem}
                    keyExtractor={item => item.runId || item.id || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Beaker size={48} color={Colors.surfaceContainer} style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyText}>No past studies yet.</Text>
                            <Text style={styles.emptySub}>Your results will appear here once you finish a protocol.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...Typography.label,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        letterSpacing: 1,
        fontWeight: '800',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: Spacing.s6,
        paddingTop: Spacing.s4,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: Colors.primarySubtle,
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        ...Shadows.ambient,
        borderWidth: 1,
        borderColor: Colors.primaryContainer,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        ...Typography.label,
        fontSize: 10,
        fontWeight: '800',
    },
    dateText: {
        ...Typography.body,
        fontSize: 12,
        color: Colors.onSurfaceVariant,
        fontWeight: '500',
    },
    cardTitle: {
        ...Typography.title,
        fontSize: 18,
        color: Colors.onSurface,
        marginBottom: 12,
    },
    resultContainer: {
        backgroundColor: Colors.primarySubtle,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    resultValue: {
        ...Typography.display,
        fontSize: 24,
        color: Colors.primary,
    },
    resultLabel: {
        ...Typography.body,
        fontSize: 12,
        color: Colors.onSurfaceVariant,
        marginTop: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confidenceText: {
        ...Typography.body,
        fontSize: 12,
        color: Colors.onSurfaceVariant,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 80,
        paddingHorizontal: 40,
    },
    emptyText: {
        ...Typography.title,
        color: Colors.onSurface,
        marginBottom: 8,
    },
    emptySub: {
        ...Typography.body,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 20,
    },
});
