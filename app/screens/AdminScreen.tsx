import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile } from '../../src/services/userProfile';
import { auth } from '../../src/services/firebaseConfig';
import { StorageService } from '../../src/services/storage';
import { ChevronLeft, Trash2, RotateCcw, Database, ShieldAlert } from 'lucide-react-native';

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
                    <ChevronLeft color="#1e293b" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin System</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Developer Utilities</Text>
                    
                    <TouchableOpacity style={styles.adminButton} onPress={handleSeed} disabled={saving}>
                        <Database color="#3b82f6" size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Seed Demo Logs</Text>
                            <Text style={styles.adminButtonSubtext}>Generate test data for your account</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.adminButton} onPress={handleClearMyLogs} disabled={saving}>
                        <Trash2 color="#64748b" size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Clear My Logs</Text>
                            <Text style={styles.adminButtonSubtext}>Delete only your logs</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>App Management</Text>
                    
                    <TouchableOpacity style={styles.adminButton} onPress={handleRestartOnboarding} disabled={saving}>
                        <RotateCcw color="#3b82f6" size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text style={styles.adminButtonText}>Restart Onboarding</Text>
                            <Text style={styles.adminButtonSubtext}>Test the new user experience</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.dangerZone}>
                        <View style={styles.dangerHeader}>
                            <ShieldAlert color="#ef4444" size={18} style={{ marginRight: 8 }} />
                            <Text style={styles.dangerHeaderText}>Danger Zone</Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.adminButton, { borderLeftColor: '#ef4444', backgroundColor: '#fef2f2' }]} 
                            onPress={handleClearSystemLogs}
                            disabled={saving}
                        >
                            <Trash2 color="#ef4444" size={20} style={{ marginRight: 12 }} />
                            <View>
                                <Text style={[styles.adminButtonText, { color: '#ef4444' }]}>Clear All System Logs</Text>
                                <Text style={styles.adminButtonSubtext}>Irreversibly delete data for ALL users</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {saving && (
                    <View style={styles.overlay}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    backButton: {
        padding: 4,
    },
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contentContainer: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    adminButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
        shadowColor: '000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    adminButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    adminButtonSubtext: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    dangerZone: {
        marginTop: 8,
        padding: 16,
        backgroundColor: '#fff1f2',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fecaca',
        borderStyle: 'dashed',
    },
    dangerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dangerHeaderText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#991b1b',
        textTransform: 'uppercase',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    }
});
