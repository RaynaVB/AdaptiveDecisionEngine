// app/screens/ExperimentHistoryScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, ChevronRight, XCircle, CheckCircle } from 'lucide-react-native';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { ExperimentRun } from '../../src/models/healthlab';

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
            // Filter out the active one, or show it at top if desired. 
            // In a "History" context, usually we show non-active ones.
            setHistory(runs.filter(r => r.status !== 'active'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderRunItem = ({ item }: { item: ExperimentRun }) => {
        const definition = EXPERIMENT_LIBRARY.find(e => e.id === item.experimentId);
        const isCompleted = item.status === 'completed';

        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.experimentId })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#dcfce7' : '#fee2e2' }]}>
                        {isCompleted ? <CheckCircle size={14} color="#16a34a" /> : <XCircle size={14} color="#dc2626" />}
                        <Text style={[styles.statusText, { color: isCompleted ? '#16a34a' : '#dc2626' }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(item.startDate).toLocaleDateString()}</Text>
                </View>

                <Text style={styles.cardTitle}>{definition?.name || 'Unknown Experiment'}</Text>
                
                {isCompleted && item.resultDelta !== undefined && (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultValue}>
                            {item.resultDelta > 0 ? '+' : ''}{Math.round(item.resultDelta)}% 
                        </Text>
                        <Text style={styles.resultLabel}>Impact on {definition?.targetMetric.replace(/_/g, ' ')}</Text>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <Text style={styles.confidenceText}>Confidence: {item.confidenceScore || 'N/A'}</Text>
                    <ChevronRight size={18} color="#9ca3af" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Experiment History</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderRunItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Beaker size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyText}>No past experiments yet.</Text>
                            <Text style={styles.emptySub}>Your results will appear here once you finish or abandon a study.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        marginRight: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    dateText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
    },
    resultContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    resultValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#2563eb',
    },
    resultLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confidenceText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 20,
    },
});
