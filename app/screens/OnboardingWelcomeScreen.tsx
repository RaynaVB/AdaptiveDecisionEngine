import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';

type OnboardingWelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingWelcome'>;

type Props = {
    navigation: OnboardingWelcomeScreenNavigationProp;
};

export default function OnboardingWelcomeScreen({ navigation }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
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
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('OnboardingProfile')}
            >
                <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
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
        padding: 24,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
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
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
