import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile } from '../../src/services/userProfile';
import { auth } from '../../src/services/firebaseConfig';
import { StorageService } from '../../src/services/storage';
import { ChevronLeft, Trash2, RotateCcw, Database, ShieldAlert } from 'lucide-react-native';
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
            await StorageService.seedDemoLogs();
            Alert.alert('Success', 'Demo logs seeded!');
        } catch (e) {
            Alert.alert('Error', 'Failed to seed logs.');
        } finally {
            setSaving(false);
        }
    };

    const handleClearMyLogs = async () => {
        Alert.alert('Confirm', 'Delete all YOUR logs?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete My Logs',
                style: 'destructive',
                onPress: async () => {
                    setSaving(true);
                    try {
                        await StorageService.clearAllLogs();
                        Alert.alert('Success', 'Your logs have been cleared.');
                    } catch (e) {
                        Alert.alert('Error', 'Failed to clear logs.');
                    } finally {
                        setSaving(false);
                    }
                }
            }
        ]);
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
        <SafeAreaView style={styles.safeArea}>
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
                            <Text style={styles.adminButtonSubtext}>Generate test data for your account</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.adminButton} onPress={handleClearMyLogs} disabled={saving}>
                        <Trash2 color={Colors.onSurfaceVariant} size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Clear My Logs</Text>
                            <Text style={styles.adminButtonSubtext}>Delete only your logs</Text>
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
