// app/screens/ExperimentDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, Play, Info } from 'lucide-react-native';
import { HealthLabService } from '../../src/services/healthLabService';
import { ExperimentDefinition, ExperimentRun } from '../../src/models/healthlab';
import { CheckCircle } from 'lucide-react-native';

type ExperimentDetailScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'ExperimentDetail'>;
    route: RouteProp<RootStackParamList, 'ExperimentDetail'>;
};

export default function ExperimentDetailScreen({ navigation, route }: ExperimentDetailScreenProps) {
    const { experimentId, experiment: initialExperiment } = route.params as any;
    const [loading, setLoading] = useState(true);
    const [definition, setDefinition] = useState<ExperimentDefinition | null>(initialExperiment || null);
    const [activeRun, setActiveRun] = useState<ExperimentRun | null>(null);

    useEffect(() => {
        if (!definition && experimentId) {
            // Fetch definition if not passed (though we prefer passing it)
            loadData();
        } else {
            loadRun();
        }
    }, [experimentId]);

    const loadRun = async () => {
        try {
            console.log(`[HealthLab] Loading run info for ${experimentId}`);
            const activeList = await HealthLabService.getActiveExperiments();
            const active = activeList.find(run => run.id === experimentId || (run as any).templateId === experimentId);
            setActiveRun(active || null);
            if (active) {
                console.log(`[HealthLab] Found active run: ${active.runId}`);
            }
        } catch (e) {
            console.error('[HealthLab] loadRun error:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            console.log(`[HealthLab] Loading data for experimentId: ${experimentId}`);
            
            // Check recommended first
            const recommended = await HealthLabService.getRecommendedExperiments();
            let found = recommended.find(r => r.template.id === experimentId)?.template;
            
            if (found) {
                console.log(`[HealthLab] Found definition in recommended: ${found.name}`);
            }

            // If not found, check active runs
            if (!found) {
                const actives = await HealthLabService.getActiveExperiments();
                console.log(`[HealthLab] Checking ${actives.length} active experiments...`);
                const activeMatch = actives.find(a => a.id === experimentId || (a as any).templateId === experimentId);
                if (activeMatch?.template) {
                    found = activeMatch.template;
                    console.log(`[HealthLab] Found definition in active: ${found.name}`);
                }
            }

            if (found) {
                setDefinition(found);
            } else {
                console.warn(`[HealthLab] Could not find definition for ${experimentId}`);
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
            await HealthLabService.startExperiment(tid);
            Alert.alert("Success", "Experiment started! Track your progress daily.");
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
                            Alert.alert("Abandoned", "Experiment has been stopped.");
                            navigation.goBack();
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
            alert(e instanceof Error ? e.message : "Failed to complete experiment");
        } finally {
            setLoading(false);
        }
    };

    if (!definition && !loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Experiment not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Experiment Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.iconCircle}>
                    <Beaker size={40} color="#2563eb" />
                </View>

                <Text style={styles.experimentName}>{definition?.name}</Text>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{definition?.durationDays} DAYS</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                        <Text style={[styles.badgeText, { color: '#475569' }]}>{definition?.category.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Info size={18} color="#2563eb" />
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

                <View style={styles.actionContainer}>
                    {loading ? (
                        <ActivityIndicator color="#2563eb" />
                    ) : activeRun ? (
                        <View style={{ gap: 12 }}>
                            <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                                <CheckCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.completeButtonText}>Complete & View Results</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.abandonButton} onPress={handleAbandon}>
                                <Text style={styles.abandonButtonText}>Abandon Experiment</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                            <Play size={20} color="#fff" fill="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.startButtonText}>Start 5-Day Experiment</Text>
                        </TouchableOpacity>
                    )}
                </View>
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
        letterSpacing: -0.3,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    experimentName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 32,
    },
    badge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2563eb',
        letterSpacing: 0.5,
    },
    infoCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2563eb',
    },
    hypothesisText: {
        fontSize: 16,
        color: '#475569',
        lineHeight: 24,
        fontWeight: '400',
    },
    detailsList: {
        width: '100%',
        gap: 16,
        marginBottom: 40,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 16,
    },
    detailLabel: {
        fontSize: 15,
        color: '#64748b',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
        textTransform: 'capitalize',
    },
    actionContainer: {
        width: '100%',
        paddingBottom: 20,
    },
    startButton: {
        backgroundColor: '#2563eb',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    completeButton: {
        backgroundColor: '#16a34a',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    abandonButton: {
        backgroundColor: '#fff',
        borderColor: '#ef4444',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    abandonButtonText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '700',
    },
});
