import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile } from '../../src/services/userProfile';
import { auth } from '../../src/services/firebaseConfig';
import { StorageService } from '../../src/services/storage';
import { InsightService } from '../../src/services/insightService';
import { RecommendationService } from '../../src/services/recommendationService';
import { WeeklyPatternsService } from '../../src/services/weeklyPatternsService';
import { ExperimentEngine } from '../../src/services/healthlab/experimentEngine';
import { ChevronLeft, Trash2, RotateCcw, Database, ShieldAlert, Beaker } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

type AdminScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Admin'>;

type Props = {
    navigation: AdminScreenNavigationProp;
};

export default function AdminScreen({ navigation }: Props) {
    const [saving, setSaving] = useState(false);

    const handleSeed = async () => {
        setSaving(true);
        try {
            // Step 1: Write demo logs to Firestore
            await StorageService.seedDemoLogs();

            // Step 2: Trigger all three intelligence engines in parallel so
            // insights, recommendations, and weekly story are ready immediately.
            await Promise.all([
                InsightService.recomputeInsights('demo_seed'),
                RecommendationService.recomputeRecommendations('demo_seed'),
                WeeklyPatternsService.recomputeWeekly('demo_seed'),
            ]);

            Alert.alert('Ready', 'Demo data seeded and intelligence generated. Navigate to any feed to see results.');
        } catch (e) {
            Alert.alert('Error', 'Seeding failed or intelligence generation timed out. Check console.');
            console.error('[Admin] Seed error:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleSimulation = async () => {
        Alert.alert(
            'Run Simulation',
            'This seeds a completed High-Protein Breakfast experiment with sample data so you can preview the results screen.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Run',
                    onPress: async () => {
                        setSaving(true);
                        try {
                            const runId = await ExperimentEngine.seedManualTestExperiment();
                            // Trigger intelligence recompute so insights reflect the experiment
                            await Promise.all([
                                InsightService.recomputeInsights('simulation').catch(() => {}),
                                RecommendationService.recomputeRecommendations('simulation').catch(() => {}),
                            ]);
                            Alert.alert('Simulation Complete', 'High-Protein Breakfast experiment seeded. You can find it in Health Lab History.', [
                                { text: 'View Result', onPress: () => navigation.navigate('ExperimentResult', { runId }) },
                                { text: 'OK' }
                            ]);
                        } catch (e) {
                            Alert.alert('Simulation Failed', 'Check that demo data has been seeded first.');
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleClearMyLogs = async () => {
        Alert.alert(
            'Reset My Data',
            'This will delete all your logs, insights, recommendations, experiments, and local caches. Use this to test the new-user experience.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Everything',
                    style: 'destructive',
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await StorageService.clearAllLogs();
                            Alert.alert('Done', 'All your data has been cleared. The app is now in a clean new-user state.');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to clear data. Check console for details.');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleClearSystemLogs = async () => {
        Alert.alert(
            "SYSTEM-WIDE DELETION",
            "WARNING: This will clear ALL data for ALL users in the system. This action is irreversible. Are you absolutely sure?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "YES, DELETE EVERYTHING", 
                    style: "destructive",
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await StorageService.clearSystemLogsForAllUsers();
                            Alert.alert("Success", "System-wide logs cleared.");
                        } catch (e) {
                            Alert.alert("Error", "Failed to clear system logs.");
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRestartOnboarding = async () => {
        const user = auth.currentUser;
        if (!user) return;

        Alert.alert(
            "Restart Onboarding",
            "This will reset your onboarding status and take you to the welcome screen.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Restart",
                    onPress: async () => {
                        setSaving(true);
                        try {
                            await updateUserProfile(user.uid, { hasCompletedOnboarding: false });
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'OnboardingWelcome' }],
                            });
                        } catch (e) {
                            Alert.alert("Error", "Failed to reset onboarding.");
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color={Colors.onSurface} size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin System</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Developer Utilities</Text>
                    
                    <TouchableOpacity style={styles.adminButton} onPress={handleSeed} disabled={saving}>
                        <Database color={Colors.primary} size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Seed Demo Logs</Text>
                            <Text style={styles.adminButtonSubtext}>Write test data + generate insights, recs & weekly story</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.adminButton} onPress={handleSimulation} disabled={saving}>
                        <Beaker color={Colors.primary} size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Run Experiment Simulation</Text>
                            <Text style={styles.adminButtonSubtext}>Seed a completed High-Protein experiment</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.adminButton, { borderLeftColor: Colors.warning }]} 
                        onPress={async () => {
                            setSaving(true);
                            try {
                                await InsightService.seedMockTriggerInsights();
                                Alert.alert('Seeded', 'Mock triggers (Greek Yogurt, Chocolate Ice Cream) have been added to your insights. Try logging them to see the alert.');
                            } catch (e) {
                                Alert.alert('Error', 'Mock seeding failed.');
                            } finally {
                                setSaving(false);
                            }
                        }} 
                        disabled={saving}
                    >
                        <ShieldAlert color={Colors.warning} size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Mock: Trigger Alerts</Text>
                            <Text style={styles.adminButtonSubtext}>Manually inject trigger insights for safety testing</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.adminButton} onPress={handleClearMyLogs} disabled={saving}>
                        <Trash2 color={Colors.onSurfaceVariant} size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Reset My Data</Text>
                            <Text style={styles.adminButtonSubtext}>Clears logs, insights, recs, experiments & cache</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>App Management</Text>
                    
                    <TouchableOpacity style={styles.adminButton} onPress={handleRestartOnboarding} disabled={saving}>
                        <RotateCcw color={Colors.primary} size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Restart Onboarding</Text>
                            <Text style={styles.adminButtonSubtext}>Test the new user experience</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.dangerZone}>
                        <View style={styles.dangerHeader}>
                            <ShieldAlert color={Colors.error} size={18} style={{ marginRight: 8 }} />
                            <Text style={styles.dangerHeaderText}>Danger Zone</Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.adminButton, { borderLeftColor: Colors.error, backgroundColor: Colors.errorContainer }]} 
                            onPress={handleClearSystemLogs}
                            disabled={saving}
                        >
                            <Trash2 color={Colors.error} size={20} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={[styles.adminButtonText, { color: Colors.error }]}>Clear All System Logs</Text>
                                <Text style={styles.adminButtonSubtext}>Irreversibly delete data for ALL users</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {saving && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainer,
    },
    headerTitle: {
        ...Typography.label,
        fontSize: 16,
        fontWeight: '800',
        color: Colors.onSurface,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        ...Typography.label,
        fontSize: 13,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    adminButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceContainer,
        borderRadius: Radii.full,
        paddingVertical: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
    },
    adminButtonText: {
        ...Typography.body,
        fontSize: 16,
        fontWeight: '700',
        color: Colors.onSurface,
    },
    adminButtonSubtext: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.onSurfaceVariant,
        marginTop: 2,
        textTransform: 'none',
        letterSpacing: 0,
    },
    dangerZone: {
        marginTop: 16,
        padding: 16,
        backgroundColor: Colors.errorContainer,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.errorContainer,
        borderStyle: 'dashed',
    },
    dangerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dangerHeaderText: {
        ...Typography.label,
        fontSize: 13,
        fontWeight: '800',
        color: Colors.error,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.glassBackground,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    }
});
