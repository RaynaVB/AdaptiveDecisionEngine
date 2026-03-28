import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, Play, Info, CheckCircle, AlertTriangle, ChevronLeft } from 'lucide-react-native';
import { HealthLabService } from '../../src/services/healthLabService';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { ExperimentDefinition, ExperimentRun } from '../../src/models/healthlab';
import { MICRO_DISCLAIMER_EXPERIMENTS } from '../constants/legal';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

type ExperimentDetailScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'ExperimentDetail'>;
    route: RouteProp<RootStackParamList, 'ExperimentDetail'>;
};

export default function ExperimentDetailScreen({ navigation, route }: ExperimentDetailScreenProps) {
    const { experimentId, experiment: initialExperiment, linkedInsightId, linkedRecommendationId } = route.params as any;
    const [loading, setLoading] = useState(true);
    const [definition, setDefinition] = useState<ExperimentDefinition | null>(initialExperiment || null);
    const [activeRun, setActiveRun] = useState<ExperimentRun | null>(null);

    useEffect(() => {
        if (!definition && experimentId) {
            loadData();
        } else {
            loadRun();
        }
    }, [experimentId]);

    const loadRun = async () => {
        try {
            const activeList = await HealthLabService.getActiveExperiments();
            const active = activeList.find(run => run.id === experimentId || (run as any).templateId === experimentId);
            setActiveRun(active || null);
        } catch (e) {
            console.error('[HealthLab] loadRun error:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const recommended = await HealthLabService.getRecommendedExperiments();
            let found = recommended.find(r => r.template.id === experimentId)?.template;

            if (!found) {
                const actives = await HealthLabService.getActiveExperiments();
                const activeMatch = actives.find(a => a.id === experimentId || (a as any).templateId === experimentId);
                if (activeMatch?.template) {
                    found = activeMatch.template;
                }
            }

            if (found) {
                setDefinition(found);
            }
            await loadRun();
        } catch (e) {
            console.error('[HealthLab] loadData error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        const tid = definition?.id || (definition as any)?.templateId;
        if (!tid) return;
        try {
            setLoading(true);
            const run = await HealthLabService.startExperiment(tid);
            // Patch provenance if this experiment was triggered from an insight or recommendation
            if (run && (linkedInsightId || linkedRecommendationId)) {
                const runId = (run as any).runId || (run as any).id;
                if (runId) {
                    ExperimentEngine.patchProvenance(runId, { linkedInsightId, linkedRecommendationId });
                }
            }
            Alert.alert("Success", "Experiment started!");
            await loadRun();
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to start experiment");
        } finally {
            setLoading(false);
        }
    };

    const handleAbandon = async () => {
        if (!activeRun) return;

        Alert.alert(
            "Abandon Experiment",
            "Are you sure you want to stop this experiment? Your progress will be lost.",
            [
                { text: "Keep Going", style: "cancel" },
                {
                    text: "Abandon",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await HealthLabService.abandonExperiment(activeRun.runId || activeRun.id);
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('HealthLab');
                            }
                        } catch (e) {
                            Alert.alert("Error", e instanceof Error ? e.message : "Failed to abandon experiment");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleComplete = async () => {
        if (!activeRun) return;
        try {
            setLoading(true);
            await HealthLabService.completeExperiment((activeRun as any).runId || activeRun.id);
            navigation.replace('ExperimentResult', { runId: (activeRun as any).runId || activeRun.id });
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to complete experiment");
        } finally {
            setLoading(false);
        }
    };

    if (!definition && !loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.emptyText}>Experiment not found</Text>
            </SafeAreaView>
        );
    }

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
                <Text style={styles.headerTitle}>Details</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroSection}>
                    <Text style={styles.experimentName}>{definition?.name}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{definition?.durationDays} DAYS</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: Colors.primarySubtle }]}>
                            <Text style={[styles.badgeText, { color: Colors.primary }]}>{(definition?.category || 'general').toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Info size={18} color={Colors.primary} />
                            <Text style={styles.infoLabel}>Hypothesis</Text>
                        </View>
                        <Text style={styles.hypothesisText}>{definition?.hypothesis}</Text>
                    </View>

                    <View style={styles.detailsList}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Target Metric</Text>
                            <Text style={styles.detailValue}>{definition?.targetMetric?.replace(/_/g, ' ') || 'General'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Required Data</Text>
                            <Text style={styles.detailValue}>{definition?.requiredEvents?.join(', ')}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: Colors.errorContainer, borderColor: Colors.errorContainer }]}>
                        <View style={styles.infoRow}>
                            <AlertTriangle size={18} color={Colors.error} />
                            <Text style={[styles.infoLabel, { color: Colors.error }]}>Medical Disclaimer</Text>
                        </View>
                        <Text style={[styles.hypothesisText, { color: Colors.error, fontSize: 13, opacity: 0.8 }]}>{MICRO_DISCLAIMER_EXPERIMENTS}</Text>
                    </View>
                </View>

                <View style={styles.actionContainer}>
                    {loading ? (
                        <ActivityIndicator color={Colors.primary} />
                    ) : activeRun ? (
                        <View style={{ gap: 16 }}>
                            <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                                <CheckCircle size={20} color={Colors.onPrimaryContrast} style={{ marginRight: 8 }} />
                                <Text style={styles.completeButtonText}>Complete Study</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.abandonButton} onPress={handleAbandon}>
                                <Text style={styles.abandonButtonText}>Stop Experiment</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                            <Play size={20} color={Colors.onPrimaryContrast} fill={Colors.onPrimaryContrast} style={{ marginRight: 8 }} />
                            <Text style={styles.startButtonText}>Start Protocol</Text>
                        </TouchableOpacity>
                    )}
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
    heroSection: {
        alignItems: 'center',
        paddingVertical: 20,
        width: '100%',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primarySubtle,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    experimentName: {
        ...Typography.display,
        fontSize: 28,
        color: Colors.onSurface,
        textAlign: 'center',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    badge: {
        backgroundColor: Colors.primarySubtle,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: Radii.md,
    },
    badgeText: {
        ...Typography.label,
        fontSize: 11,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    infoSection: {
        width: '100%',
        marginTop: 8,
    },
    infoCard: {
        backgroundColor: Colors.primarySubtle,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.primaryContainer,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.s3,
        marginBottom: 8,
    },
    infoLabel: {
        ...Typography.label,
        fontSize: 14,
        fontWeight: '800',
        color: Colors.primary,
    },
    hypothesisText: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurface,
        lineHeight: 22,
    },
    detailsList: {
        width: '100%',
        gap: 12,
        marginBottom: 24,
        paddingHorizontal: Spacing.s4,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainer,
        paddingBottom: 12,
    },
    detailLabel: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        fontWeight: '500',
    },
    detailValue: {
        ...Typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.onSurface,
        textTransform: 'capitalize',
    },
    actionContainer: {
        width: '100%',
        marginTop: 16,
    },
    startButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radii.xl,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.ambient,
    },
    startButtonText: {
        color: Colors.onPrimaryContrast,
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    completeButton: {
        backgroundColor: Colors.secondary,
        borderRadius: Radii.xl,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.ambient,
    },
    completeButtonText: {
        color: Colors.onPrimaryContrast,
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    abandonButton: {
        backgroundColor: 'transparent',
        borderColor: Colors.error,
        borderWidth: 1.5,
        borderRadius: Radii.xl,
        padding: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    abandonButtonText: {
        color: Colors.error,
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
        marginTop: 40,
    }
});
