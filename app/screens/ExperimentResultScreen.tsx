import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, CheckCircle2, TrendingUp, Info, AlertTriangle, RotateCcw, ChevronLeft } from 'lucide-react-native';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { ExperimentRun } from '../../src/models/healthlab';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

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
            const found = runs.find(r => r.runId === runId || r.id === runId);
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
            await ExperimentEngine.startExperiment(run.id);
            navigation.goBack();
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to retry experiment");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!run) return null;
    const definition = EXPERIMENT_LIBRARY.find(e => e.id === run.id || e.id === run.experimentId);
    if (!definition) return null;

    const delta = run.resultDelta || 0;
    const isPositiveChange = delta > 0;
    const confidenceColor = run.confidenceScore === 'high' ? Colors.primary : run.confidenceScore === 'medium' ? '#f59e0b' : Colors.error;

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Results</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.successIcon}>
                    <CheckCircle2 size={60} color={Colors.secondary} />
                </View>

                <Text style={styles.experimentName}>{definition.name}</Text>
                <Text style={styles.dateRange}>
                    {run.startDate ? new Date(run.startDate).toLocaleDateString() : 'Recent'} — {run.endDate ? new Date(run.endDate).toLocaleDateString() : 'Today'}
                </Text>

                <View style={[styles.resultCard, { borderColor: isPositiveChange ? Colors.secondary + '40' : Colors.error + '40' }]}>
                    <Text style={styles.resultLabel}>Impact on {definition.targetMetric.replace(/_/g, ' ')}</Text>
                    <View style={styles.deltaRow}>
                        <TrendingUp size={32} color={isPositiveChange ? Colors.secondary : Colors.error} style={{ transform: [{ rotate: isPositiveChange ? '0deg' : '180deg' }] }} />
                        <Text style={[styles.deltaValue, { color: isPositiveChange ? Colors.secondary : Colors.error }]}>
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
                            <Info size={18} color={Colors.primary} />
                            <Text style={styles.infoTitle}>Confidence Score</Text>
                        </View>
                        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '15' }]}>
                            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                                {run.confidenceScore?.toUpperCase() || 'N/A'}
                            </Text>
                        </View>
                        <Text style={styles.infoDesc}>
                            Based on data density and compliance throughout the study period.
                        </Text>
                    </View>

                    <View style={styles.infoItem}>
                        <View style={styles.infoHead}>
                            <AlertTriangle size={18} color={Colors.primary} />
                            <Text style={styles.infoTitle}>Recommendation</Text>
                        </View>
                        <Text style={styles.recommendationText}>
                            {isPositiveChange 
                                ? "This habit shows a positive impact on your metrics. We recommend continuing this behavior to solidify the pattern."
                                : "The data doesn't show a significant positive impact yet. You might want to try a different variation or focus on another metric."}
                        </Text>
                    </View>
                </View>

                <View style={styles.actionContainer}>
                    {run.confidenceScore === 'low' && (
                        <TouchableOpacity 
                            style={styles.retryButton} 
                            onPress={handleRetry}
                            disabled={loading}
                        >
                            <RotateCcw size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.retryButtonText}>Repeat for More Data</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={styles.doneButton} 
                        onPress={() => navigation.navigate('HealthLab')}
                    >
                        <Text style={styles.doneButtonText}>Finish Protocol</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
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
    content: {
        paddingHorizontal: Spacing.s6,
        paddingBottom: 40,
        alignItems: 'center',
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(7, 45, 34, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 24,
    },
    experimentName: {
        ...Typography.title,
        fontSize: 26,
        color: Colors.onSurface,
        textAlign: 'center',
        marginBottom: 8,
    },
    dateRange: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        marginBottom: 32,
        fontWeight: '500',
    },
    resultCard: {
        width: '100%',
        backgroundColor: 'rgba(216, 230, 222, 0.1)',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 32,
    },
    resultLabel: {
        ...Typography.label,
        fontSize: 12,
        color: Colors.onSurfaceVariant,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    deltaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    deltaValue: {
        ...Typography.display,
        fontSize: 56,
        fontWeight: '900',
        letterSpacing: -2,
    },
    resultDetails: {
        ...Typography.body,
        fontSize: 13,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        fontWeight: '500',
    },
    infoSection: {
        width: '100%',
        gap: 32,
        marginBottom: 40,
        paddingHorizontal: Spacing.s4,
    },
    infoItem: {
        width: '100%',
    },
    infoHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    infoTitle: {
        ...Typography.title,
        fontSize: 16,
        color: Colors.onSurface,
    },
    confidenceBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    confidenceText: {
        ...Typography.label,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    infoDesc: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        lineHeight: 20,
    },
    recommendationText: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurface,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    actionContainer: {
        width: '100%',
        gap: 16,
    },
    doneButton: {
        width: '100%',
        backgroundColor: Colors.primary,
        borderRadius: Radii.xl,
        padding: 20,
        alignItems: 'center',
        ...Shadows.ambient,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    retryButton: {
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: Radii.xl,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    retryButtonText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
