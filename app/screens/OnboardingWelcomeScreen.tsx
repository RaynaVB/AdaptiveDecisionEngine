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
                <Text style={styles.title}>Welcome to Adaptive Decision Engine</Text>
                <Text style={styles.subtitle}>
                    Discover how your meals affect your mood, energy, and overall wellbeing.
                </Text>

                <View style={styles.features}>
                    <FeatureItem icon="🍽️" text="Log your daily meals easily" />
                    <FeatureItem icon="😊" text="Track mood shifts throughout the day" />
                    <FeatureItem icon="🧠" text="Discover hidden patterns automatically" />
                    <FeatureItem icon="💡" text="Get personalized actionable recommendations" />
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
