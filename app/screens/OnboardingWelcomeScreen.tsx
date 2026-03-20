import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MEDICAL_DISCLAIMER_FULL } from '../constants/legal';
import { CheckCircle2, Circle } from 'lucide-react-native';

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
        backgroundColor: '#f8fafc',
    },
    scrollContainer: {
        flex: 1,
    },
    content: {
        padding: 24,
        paddingTop: 64,
        paddingBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 16,
    },
    badge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        alignSelf: 'center',
        marginBottom: 8,
    },
    badgeText: {
        color: '#2563eb',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 24,
    },
    features: {
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    featureIcon: {
        fontSize: 24,
        marginRight: 16,
    },
    featureText: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
        flex: 1,
    },
    disclaimerContainer: {
        backgroundColor: '#f1f5f9',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    disclaimerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    disclaimerText: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    checkboxText: {
        fontSize: 14,
        color: '#475569',
        flex: 1,
    },
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#94a3b8',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
