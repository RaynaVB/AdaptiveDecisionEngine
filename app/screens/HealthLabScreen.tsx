// app/screens/HealthLabScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../src/models/navigation';
import { ArrowLeft, Beaker, Play, ChevronRight, History, Sparkles } from 'lucide-react-native';
import { HealthLabService, RecommendedExperiment } from '../../src/services/healthLabService';
import { ExperimentRun, ExperimentDefinition } from '../../src/models/healthlab';
import { StorageService } from '../../src/services/storage';
import { auth } from '../../src/services/firebaseConfig';
import { getUserProfile, isInternalUser, UserProfile } from '../../src/services/userProfile';

type HealthLabScreenProps = {
    navigation: StackNavigationProp<RootStackParamList, 'HealthLab'>;
};

export default function HealthLabScreen({ navigation }: HealthLabScreenProps) {
    const [loading, setLoading] = useState(true);
    const [activeExperiments, setActiveExperiments] = useState<ExperimentRun[]>([]);
    const [recommendedExperiments, setRecommendedExperiments] = useState<RecommendedExperiment[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const [actives, recommended] = await Promise.all([
                HealthLabService.getActiveExperiments(),
                HealthLabService.getRecommendedExperiments(),
            ]);
            
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                setUserProfile(profile);
            }

            setActiveExperiments(actives);
            setRecommendedExperiments(recommended);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderRecommendedCard = (scored: RecommendedExperiment) => {
        const { template: item, reason } = scored;
        const isActive = activeExperiments.some(run => run.experimentId === item.id);

        return (
            <TouchableOpacity 
                key={item.id}
                style={styles.recommendedCard}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.id })}
            >
                <View style={styles.recommendedContent}>
                    <View style={styles.recommendedIconContainer}>
                        <Sparkles size={22} color="#f59e0b" />
                    </View>
                    <View style={styles.recommendedTextContainer}>
                        <Text style={styles.recommendedTitle}>{item.name}</Text>
                        <Text style={styles.recommendedHypothesis} numberOfLines={2}>{item.hypothesis}</Text>
                        <View style={styles.recommendedFooter}>
                            <Text style={styles.durationTag}>{item.durationDays} Days</Text>
                            {reason ? (
                                <Text style={styles.reasonTag}>{reason}</Text>
                            ) : null}
                        </View>
                    </View>
                    <ChevronRight size={20} color="#f59e0b" />
                </View>
            </TouchableOpacity>
        );
    };

    const renderExperimentItem = ({ item }: { item: ExperimentDefinition }) => {
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.id })}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: '#f3f4f6' }]}>
                        <Beaker size={20} color={'#6b7280'} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardHypothesis} numberOfLines={2}>{item.hypothesis}</Text>
                        <View style={styles.cardFooter}>
                            <Text style={styles.durationTag}>{item.durationDays} Days</Text>
                            <Text style={styles.categoryTag}>{item.category}</Text>
                        </View>
                    </View>
                    <ChevronRight size={20} color="#9ca3af" />
                </View>
            </TouchableOpacity>
        );
    };

    const handleSimulateTest = async () => {
        // This was for local testing, can be removed or updated to use backend
        setLoading(true);
        try {
            // navigation.navigate('ExperimentHistory');
        } catch (e) {
            console.error(e);
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
                    {isInternalUser(userProfile) && (
                        <View style={styles.debugSection}>
                            <TouchableOpacity style={styles.debugButton} onPress={handleSimulateTest}>
                                <Beaker size={18} color="#2563eb" style={{ marginRight: 8 }} />
                                <Text style={styles.debugButtonText}>Admin Simulation Mode</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeExperiments.length > 0 && (
                        <View style={styles.activeSection}>
                            <Text style={styles.sectionTitle}>Active Experiments</Text>
                            {activeExperiments.map(activeRun => (
                                <TouchableOpacity 
                                    key={activeRun.id}
                                    style={[styles.activeHighlightCard, { marginBottom: 16 }]}
                                    onPress={() => navigation.navigate('ExperimentDetail', { experimentId: activeRun.id })}
                                >
                                    <View style={styles.activeHeader}>
                                        <View style={styles.activeIconContainer}>
                                            <Play size={24} color="#fff" fill="#fff" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.activeTitle}>
                                                {activeRun.template?.name || 'Active Experiment'}
                                            </Text>
                                            <Text style={styles.activeSub}>Track your progress daily</Text>
                                        </View>
                                        <ChevronRight size={24} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Recommended For You section */}
                    {recommendedExperiments.length > 0 && (
                        <View style={styles.recommendedSection}>
                            <Text style={styles.sectionTitle}>✨ Recommended For You</Text>
                            <Text style={styles.recommendedSubtitle}>Based on your symptoms, sensitivities, and goals</Text>
                            {recommendedExperiments.map(renderRecommendedCard)}
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

    // Recommended For You section
    recommendedSection: {
        marginBottom: 24,
    },
    recommendedSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: -8,
        marginBottom: 16,
    },
    recommendedCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 18,
        marginBottom: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#fcd34d',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    recommendedContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recommendedIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    recommendedTextContainer: {
        flex: 1,
    },
    recommendedTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#92400e',
        marginBottom: 6,
        letterSpacing: -0.2,
    },
    recommendedHypothesis: {
        fontSize: 14,
        color: '#78716c',
        lineHeight: 20,
        fontWeight: '400',
    },
    recommendedFooter: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    reasonTag: {
        fontSize: 12,
        color: '#92400e',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '600',
        fontStyle: 'italic',
    },

    // Regular experiment cards
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
