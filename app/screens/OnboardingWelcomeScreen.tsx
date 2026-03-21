import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MEDICAL_DISCLAIMER_FULL } from '../constants/legal';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

type OnboardingWelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingWelcome'>;

type Props = {
    navigation: OnboardingWelcomeScreenNavigationProp;
};

export default function OnboardingWelcomeScreen({ navigation }: Props) {
    const [accepted, setAccepted] = useState(false);

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>BETA</Text>
                </View>
                <Text style={styles.title}>Understand your body, starting with food</Text>

                <Text style={styles.subtitle}>
                    See how what you eat connects to your energy, mood, digestion, and daily symptoms.
                </Text>

                <View style={styles.features}>
                    <FeatureItem icon="📸" text="Snap a photo of your meals — no manual logging" />
                    <FeatureItem icon="🧠" text="We identify ingredients and detect patterns automatically" />
                    <FeatureItem icon="🔍" text="Discover which foods may be causing your symptoms" />
                    <FeatureItem icon="💡" text="Get simple, personalized insights to feel better" />
                </View>

                <View style={styles.disclaimerContainer}>
                    <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
                    <Text style={styles.disclaimerText}>{MEDICAL_DISCLAIMER_FULL}</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.checkboxContainer} 
                    onPress={() => setAccepted(!accepted)}
                    activeOpacity={0.7}
                >
                    {accepted ? (
                        <CheckCircle2 size={24} color="#3b82f6" />
                    ) : (
                        <Circle size={24} color="#64748b" />
                    )}
                    <Text style={styles.checkboxText}>
                        I have read and agree to the medical disclaimer
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, !accepted && styles.buttonDisabled]}
                    onPress={() => accepted && navigation.navigate('OnboardingProfile')}
                    disabled={!accepted}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const FeatureItem = ({ icon, text }: { icon: string, text: string }) => (
    <View style={styles.featureItem}>
        <Text style={styles.featureIcon}>{icon}</Text>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContainer: {
        flex: 1,
    },
    content: {
        padding: 24,
        paddingTop: 80,
        paddingBottom: 40,
        alignItems: 'center',
    },
    title: {
        ...Typography.display,
        fontSize: 36,
        color: Colors.onSurface,
        textAlign: 'center',
        marginBottom: 16,
    },
    badge: {
        backgroundColor: Colors.primaryContainer,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: Radii.full,
        alignSelf: 'center',
        marginBottom: 12,
    },
    badgeText: {
        ...Typography.label,
        color: Colors.onPrimaryContainer,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    subtitle: {
        ...Typography.body,
        fontSize: 17,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 26,
    },
    features: {
        width: '100%',
        marginBottom: 32,
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceContainerLow,
        padding: 20,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        ...Shadows.ambient,
    },
    featureIcon: {
        fontSize: 28,
        marginRight: 16,
    },
    featureText: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurface,
        fontWeight: '600',
        flex: 1,
        lineHeight: 22,
    },
    disclaimerContainer: {
        backgroundColor: 'rgba(79, 99, 89, 0.05)',
        padding: 20,
        borderRadius: Radii.lg,
        marginTop: 24,
        borderWidth: 1,
        borderColor: 'rgba(79, 99, 89, 0.1)',
        width: '100%',
    },
    disclaimerTitle: {
        ...Typography.label,
        fontSize: 13,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    disclaimerText: {
        ...Typography.body,
        fontSize: 13,
        color: Colors.onSurfaceVariant,
        lineHeight: 18,
        opacity: 0.8,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 32,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainer,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    checkboxText: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        flex: 1,
        lineHeight: 20,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: Radii.xl,
        padding: 20,
        alignItems: 'center',
        ...Shadows.ambient,
    },
    buttonDisabled: {
        backgroundColor: Colors.surfaceContainerHighest,
        opacity: 0.6,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
