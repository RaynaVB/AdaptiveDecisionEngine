// app/screens/HealthLabScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, Play, ChevronRight, History } from 'lucide-react-native';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { EXPERIMENT_LIBRARY } from '../../src/services/healthlab/definitions';
import { ExperimentRun, ExperimentDefinition } from '../../src/models/healthlab';
import { StorageService } from '../../src/services/storage';

type HealthLabScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'HealthLab'>;
};

export default function HealthLabScreen({ navigation }: HealthLabScreenProps) {
    const [loading, setLoading] = useState(true);
    const [activeExperiment, setActiveExperiment] = useState<ExperimentRun | null>(null);
    const [availableExperiments, setAvailableExperiments] = useState<ExperimentDefinition[]>(EXPERIMENT_LIBRARY);
    const [hasRecentSymptoms, setHasRecentSymptoms] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const [active, history, recentSymptoms] = await Promise.all([
                ExperimentEngine.getActiveExperiment(),
                ExperimentEngine.getExperimentRuns(),
                StorageService.getSymptomEvents()
            ]);
            
            setActiveExperiment(active);
            setHasRecentSymptoms(recentSymptoms.length > 0);

            // Filter out experiments that have been completed with High/Medium confidence
            const excludedIds = history
                .filter(run => run.status === 'completed' && (run.confidenceScore === 'high' || run.confidenceScore === 'medium'))
                .map(run => run.experimentId);

            const filtered = EXPERIMENT_LIBRARY.filter(def => !excludedIds.includes(def.id));
            setAvailableExperiments(filtered);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderExperimentItem = ({ item }: { item: ExperimentDefinition }) => {
        const isActive = activeExperiment?.experimentId === item.id;

        return (
            <TouchableOpacity 
                style={[styles.card, isActive && styles.activeCard]}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.id })}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: isActive ? '#dbeafe' : '#f3f4f6' }]}>
                        <Beaker size={20} color={isActive ? '#2563eb' : '#6b7280'} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardHypothesis} numberOfLines={2}>{item.hypothesis}</Text>
                        <View style={styles.cardFooter}>
                            <Text style={styles.durationTag}>{item.durationDays} Days</Text>
                            {hasRecentSymptoms && item.category === 'symptom' ? (
                                <Text style={[styles.categoryTag, { backgroundColor: '#fef2f2', color: '#991b1b' }]}>✨ Recommended</Text>
                            ) : (
                                <Text style={styles.categoryTag}>{item.category}</Text>
                            )}
                        </View>
                    </View>
                    {isActive ? (
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                    ) : (
                        <ChevronRight size={20} color="#9ca3af" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const handleSimulateTest = async () => {
        setLoading(true);
        try {
            const runId = await ExperimentEngine.seedManualTestExperiment();
            navigation.navigate('ExperimentResult', { runId });
        } catch (e) {
            alert("Simulation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>HealthLab</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ExperimentHistory')} style={styles.historyButton}>
                    <History size={24} color="#2563eb" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.debugSection}>
                        <TouchableOpacity style={styles.debugButton} onPress={handleSimulateTest}>
                            <Beaker size={18} color="#2563eb" style={{ marginRight: 8 }} />
                            <Text style={styles.debugButtonText}>Simulate Full 7-Day Study Result</Text>
                        </TouchableOpacity>
                    </View>

                    {activeExperiment && (
                        <View style={styles.activeSection}>
                            <Text style={styles.sectionTitle}>Active Experiment</Text>
                            <TouchableOpacity 
                                style={styles.activeHighlightCard}
                                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: activeExperiment.experimentId })}
                            >
                                <View style={styles.activeHeader}>
                                    <View style={styles.activeIconContainer}>
                                        <Play size={24} color="#fff" fill="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.activeTitle}>
                                            {availableExperiments.find(e => e.id === activeExperiment.experimentId)?.name}
                                        </Text>
                                        <Text style={styles.activeSub}>Track your progress daily</Text>
                                    </View>
                                    <ChevronRight size={24} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>Available Experiments</Text>
                    <FlatList
                        data={availableExperiments}
                        renderItem={renderExperimentItem}
                        keyExtractor={item => item.id}
                        scrollEnabled={false}
                    />
                </ScrollView>
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
    historyButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        marginLeft: 'auto',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 16,
        marginTop: 12,
        letterSpacing: -0.4,
    },
    activeSection: {
        marginBottom: 12,
    },
    activeHighlightCard: {
        backgroundColor: '#2563eb',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    activeTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    activeSub: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 15,
        fontWeight: '500',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        marginBottom: 16,
        padding: 20,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    activeCard: {
        borderColor: '#bfdbfe',
        backgroundColor: '#f0f7ff',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    cardHypothesis: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
        fontWeight: '400',
    },
    cardFooter: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    durationTag: {
        fontSize: 12,
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '700',
    },
    categoryTag: {
        fontSize: 12,
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    activeBadge: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    activeBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    debugSection: {
        marginBottom: 20,
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    debugButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    debugButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2563eb',
    },
});
