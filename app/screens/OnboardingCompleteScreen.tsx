import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile } from '../../src/services/userProfile';
import { auth } from '../../src/services/firebaseConfig';

type OnboardingCompleteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingComplete'>;

type Props = {
    navigation: OnboardingCompleteScreenNavigationProp;
};

export default function OnboardingCompleteScreen({ navigation }: Props) {
    const [finalizing, setFinalizing] = useState(false);

    const handleComplete = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setFinalizing(true);
        try {
            // This will trigger the onSnapshot in AppNavigator, and swap the stack
            await updateUserProfile(user.uid, {
                hasCompletedOnboarding: true
            });
        } catch (error) {
            console.error("Failed to complete onboarding:", error);
            Alert.alert("Error", "Could not complete setup. Please try again.");
            setFinalizing(false); // Only set to false on error, success will unmount it
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.title}>You're all set!</Text>
                <Text style={styles.subtitle}>
                    Your profile is ready. Start by logging your first meal and let the engine learn your patterns.
                </Text>
            </View>

            <TouchableOpacity 
                style={[styles.button, finalizing && styles.buttonDisabled]} 
                onPress={handleComplete}
                disabled={finalizing}
            >
                {finalizing ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.buttonText}>Start the Engine</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 24,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 72,
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
        minHeight: 56,
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
