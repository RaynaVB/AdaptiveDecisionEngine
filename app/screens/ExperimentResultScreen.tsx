// app/screens/ExperimentResultScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, CheckCircle2, TrendingUp, Info, AlertTriangle } from 'lucide-react-native';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { ExperimentRun } from '../../src/models/healthlab';
import { RotateCcw } from 'lucide-react-native';

type ExperimentResultScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'ExperimentResult'>;
    route: RouteProp<RootStackParamList, 'ExperimentResult'>;
};

export default function ExperimentResultScreen({ navigation, route }: ExperimentResultScreenProps) {
    const { runId } = route.params;
    const [loading, setLoading] = useState(true);
    const [run, setRun] = useState<ExperimentRun | null>(null);

    useEffect(() => {
        loadRun();
    }, [runId]);

    const loadRun = async () => {
        try {
            const runs = await ExperimentEngine.getExperimentRuns();
            const found = runs.find(r => r.id === runId);
            setRun(found || null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async () => {
        if (!run) return;
        setLoading(true);
        try {
            await ExperimentEngine.startExperiment(run.experimentId);
            // After starting, go back to the dashboard
            navigation.goBack();
        } catch (e) {
            alert(e instanceof Error ? e.message : "Failed to retry experiment");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#2563eb" />
            </SafeAreaView>
        );
    }

    if (!run) return null;
    const definition = EXPERIMENT_LIBRARY.find(e => e.id === run.experimentId);
    if (!definition) return null;

    const delta = run.resultDelta || 0;
    const isPositiveChange = delta > 0;
    const confidenceColor = run.confidenceScore === 'high' ? '#16a34a' : run.confidenceScore === 'medium' ? '#f59e0b' : '#ef4444';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Experiment Result</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.successIcon}>
                    <CheckCircle2 size={60} color="#16a34a" />
                </View>

                <Text style={styles.experimentName}>{definition.name}</Text>
                <Text style={styles.dateRange}>
                    {new Date(run.startDate).toLocaleDateString()} — {new Date(run.endDate || '').toLocaleDateString()}
                </Text>

                <View style={[styles.resultCard, { borderColor: isPositiveChange ? '#bbf7d0' : '#fecaca' }]}>
                    <Text style={styles.resultLabel}>Impact on {definition.targetMetric.replace(/_/g, ' ')}</Text>
                    <View style={styles.deltaRow}>
                        <TrendingUp size={32} color={isPositiveChange ? '#16a34a' : '#ef4444'} style={{ transform: [{ rotate: isPositiveChange ? '0deg' : '180deg' }] }} />
                        <Text style={[styles.deltaValue, { color: isPositiveChange ? '#16a34a' : '#ef4444' }]}>
                            {isPositiveChange ? '+' : ''}{Math.round(delta)}%
                        </Text>
                    </View>
                    <Text style={styles.resultDetails}>
                        Compared to your {definition.baselineWindowDays}-day baseline of {run.baselineValue?.toFixed(1)}.
                    </Text>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoItem}>
                        <View style={styles.infoHead}>
                            <Info size={18} color="#2563eb" />
                            <Text style={styles.infoTitle}>Confidence Score</Text>
                        </View>
                        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
                            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                                {run.confidenceScore?.toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.infoDesc}>
                            Based on data density and compliance throughout the study period.
                        </Text>
                    </View>

                    <View style={styles.infoItem}>
                        <View style={styles.infoHead}>
                            <AlertTriangle size={18} color="#2563eb" />
                            <Text style={styles.infoTitle}>Recommendation</Text>
                        </View>
                        <Text style={styles.recommendationText}>
                            {isPositiveChange 
                                ? "This habit shows a positive impact on your metrics. We recommend continuing this behavior to solidify the pattern."
                                : "The data doesn't show a significant positive impact yet. You might want to try a different variation or focus on another metric."}
                        </Text>
                    </View>
                </View>

                {run.confidenceScore === 'low' && (
                    <TouchableOpacity 
                        style={styles.retryButton} 
                        onPress={handleRetry}
                        disabled={loading}
                    >
                        <RotateCcw size={20} color="#2563eb" style={{ marginRight: 8 }} />
                        <Text style={styles.retryButtonText}>Retry Experiment for More Data</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    style={styles.doneButton} 
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.doneButtonText}>Back to HealthLab</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
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
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    experimentName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 8,
    },
    dateRange: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 32,
        fontWeight: '500',
    },
    resultCard: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 32,
    },
    resultLabel: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    deltaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    deltaValue: {
        fontSize: 56,
        fontWeight: '900',
        letterSpacing: -2,
    },
    resultDetails: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        fontWeight: '500',
    },
    infoSection: {
        width: '100%',
        gap: 24,
        marginBottom: 40,
    },
    infoItem: {
        width: '100%',
    },
    infoHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    confidenceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    confidenceText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    infoDesc: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    recommendationText: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 22,
        fontStyle: 'italic',
    },
    doneButton: {
        width: '100%',
        backgroundColor: '#0f172a',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    retryButton: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2563eb',
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    retryButtonText: {
        color: '#2563eb',
        fontSize: 16,
        fontWeight: '700',
    },
});
