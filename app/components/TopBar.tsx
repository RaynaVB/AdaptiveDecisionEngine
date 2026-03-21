import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Alert } from 'react-native';
import { Menu, Bell, Settings, LogOut, ShieldCheck, Home } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../src/services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { isInternalUser, UserProfile } from '../../src/services/userProfile';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

interface TopBarProps {
    title?: string;
    showNotification?: boolean;
    userProfile?: UserProfile | null;
}

export const TopBar: React.FC<TopBarProps> = ({
    title = 'Veyra',
    showNotification = false,
    userProfile = null
}) => {
    const navigation = useNavigation<any>();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = useCallback(async () => {
        Alert.alert('Sign Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await signOut(auth);
                }
            }
        ]);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.rightSection}>
                {showNotification && (
                    <TouchableOpacity style={styles.iconButton}>
                        <Bell color={Colors.onSurfaceVariant} size={24} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.iconButton}>
                    <Menu color={Colors.primary} size={24} />
                </TouchableOpacity>
            </View>

            <Modal
                visible={isMenuOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsMenuOpen(false)}
            >
                <TouchableOpacity
                    style={styles.menuBackdrop}
                    activeOpacity={1}
                    onPress={() => setIsMenuOpen(false)}
                >
                    <View style={styles.menuContent}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setIsMenuOpen(false);
                                navigation.navigate('Settings');
                            }}
                        >
                            <Settings color={Colors.primary} size={20} />
                            <Text style={styles.menuItemText}>Preferences</Text>
                        </TouchableOpacity>

                        {isInternalUser(userProfile) && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setIsMenuOpen(false);
                                    navigation.navigate('Admin');
                                }}
                            >
                                <ShieldCheck color="#10b981" size={20} />
                                <Text style={[styles.menuItemText, { color: '#10b981' }]}>Admin System</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setIsMenuOpen(false);
                                handleLogout();
                            }}
                        >
                            <LogOut color="#6b7280" size={20} />
                            <Text style={styles.menuItemText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.s4,
        backgroundColor: Colors.background,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
    },
    title: {
        ...Typography.title,
        fontSize: 20,
        color: Colors.onSurface,
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    menuContent: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 60,
        right: 16,
        backgroundColor: Colors.background,
        borderRadius: Radii.lg,
        padding: Spacing.s2,
        minWidth: 180,
        ...Shadows.ambient,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.s3,
        borderRadius: Radii.md,
    },
    menuItemText: {
        marginLeft: Spacing.s3,
        ...Typography.body,
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: Colors.surfaceContainer,
        marginVertical: Spacing.s1,
    }
});
