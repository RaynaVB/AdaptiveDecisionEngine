// app/screens/HealthLabScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
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
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';
import { TopBar } from '../components/TopBar';
import { ActiveExperimentCard } from '../components/ActiveExperimentCard';

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

        return (
            <TouchableOpacity 
                key={item.id}
                style={styles.recommendedCard}
                onPress={() => navigation.navigate('ExperimentDetail', { experimentId: item.id })}
            >
                <View style={styles.recommendedContent}>
                    <View style={styles.recommendedIconContainer}>
                        <Sparkles size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.recommendedTextContainer}>
                        <Text style={styles.recommendedTitle}>{item.name}</Text>
                        <Text style={styles.recommendedHypothesis} numberOfLines={2}>{item.hypothesis}</Text>
                        <View style={styles.recommendedFooter}>
                            <View style={styles.durationBadge}>
                                <Text style={styles.durationBadgeText}>{item.durationDays} DAYS</Text>
                            </View>
                            {reason ? (
                                <Text style={styles.reasonText} numberOfLines={1}>{reason}</Text>
                            ) : null}
                        </View>
                    </View>
                    <View style={styles.chevronContainer}>
                        <ChevronRight size={18} color={Colors.onSurfaceVariant} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 0, backgroundColor: Colors.background }} edges={['top']} />
            
            <TopBar userProfile={userProfile} />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageLabel}>SCIENTIFIC TESTING</Text>
                        <View style={styles.titleRow}>
                            <Text style={styles.pageTitle}>Health Lab</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('ExperimentHistory')} style={styles.historyButton}>
                                <History size={20} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>


                    {activeExperiments.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionLabel}>ACTIVE NOW</Text>
                                <View style={styles.sectionLine} />
                            </View>
                            {activeExperiments.map(activeRun => (
                                <ActiveExperimentCard
                                    key={activeRun.id}
                                    experiment={activeRun}
                                    onPress={(run) => navigation.navigate('ExperimentDetail', { experimentId: run.id })}
                                />
                            ))}
                        </View>
                    )}

                    {recommendedExperiments.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionLabel}>RECOMMENDED FOR YOU</Text>
                                <View style={styles.sectionLine} />
                            </View>
                            <Text style={styles.sectionSubtitle}>Personalized protocols based on your patterns.</Text>
                            {recommendedExperiments.map(renderRecommendedCard)}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: Spacing.s6,
        paddingTop: Spacing.s4,
        paddingBottom: 120,
    },
    pageHeader: {
        marginBottom: Spacing.s6,
    },
    pageLabel: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pageTitle: {
        ...Typography.display,
        fontSize: 36,
        color: Colors.onSurface,
    },
    historyButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        marginBottom: Spacing.s6,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.s4,
    },
    sectionLabel: {
        ...Typography.label,
        color: Colors.primary,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.surfaceContainer,
        marginLeft: Spacing.s4,
    },
    sectionSubtitle: {
        ...Typography.body,
        fontSize: 13,
        color: Colors.onSurfaceVariant,
        marginBottom: Spacing.s4,
    },
    activeCard: {
        backgroundColor: Colors.primary,
        borderRadius: 20,
        padding: 16,
        ...Shadows.ambient,
    },
    activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.onPrimaryAlphaLow,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    activeTitle: {
        ...Typography.title,
        color: Colors.onPrimaryContrast,
        fontSize: 18,
    },
    activeSub: {
        ...Typography.body,
        color: Colors.onPrimaryAlphaMedium,
        fontSize: 13,
    },
    recommendedCard: {
        backgroundColor: Colors.primarySubtle,
        borderRadius: 20,
        padding: 16,
        marginBottom: Spacing.s3,
        ...Shadows.ambient,
        borderWidth: 1,
        borderColor: Colors.primaryContainer,
    },
    recommendedContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    recommendedIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    recommendedTextContainer: {
        flex: 1,
    },
    recommendedTitle: {
        ...Typography.title,
        fontSize: 17,
        color: Colors.onSurface,
        marginBottom: 2,
    },
    recommendedHypothesis: {
        ...Typography.body,
        fontSize: 13,
        color: Colors.onSurfaceVariant,
        lineHeight: 18,
        marginBottom: 8,
    },
    recommendedFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    durationBadge: {
        backgroundColor: Colors.primarySubtle,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    durationBadgeText: {
        ...Typography.label,
        fontSize: 9,
        color: Colors.primary,
        fontWeight: '800',
    },
    reasonText: {
        ...Typography.body,
        fontSize: 12,
        color: Colors.primary,
        fontStyle: 'italic',
        flex: 1,
    },
    chevronContainer: {
        height: 40,
        justifyContent: 'center',
        paddingLeft: 4,
    },
    debugSection: {
        marginBottom: Spacing.s6,
        padding: 16,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        borderStyle: 'dashed',
        backgroundColor: Colors.surfaceContainerLow,
    },
    debugButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    debugButtonText: {
        ...Typography.label,
        color: Colors.primary,
        fontWeight: '700',
    },
});
