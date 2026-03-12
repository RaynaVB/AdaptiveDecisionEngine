import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile } from '../../src/services/userProfile';
import { auth } from '../../src/services/firebaseConfig';

type OnboardingProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingProfile'>;

type Props = {
    navigation: OnboardingProfileScreenNavigationProp;
};

const GOAL_OPTIONS = [
    "Understand my eating habits",
    "Understand my mood swings"
];

const DIETARY_OPTIONS = [
    "Dairy-Free",
    "Gluten-Free",
    "Vegan",
    "Vegetarian",
    "Peanuts",
    "Tree Nuts",
    "Eggs",
    "Soy",
    "Fish/Shellfish",
    "Other"
];

export default function OnboardingProfileScreen({ navigation }: Props) {
    const [name, setName] = useState('');
    const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
    const [otherRestriction, setOtherRestriction] = useState('');
    const [foodsDisliked, setFoodsDisliked] = useState('');
    const [primaryGoal, setPrimaryGoal] = useState('');
    const [saving, setSaving] = useState(false);

    const handleNext = async () => {
        if (!name.trim()) {
            Alert.alert("Required", "Please tell us your name to continue.");
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        const finalRestrictions = [
            ...selectedRestrictions.filter(r => r !== 'Other'),
            ...(selectedRestrictions.includes('Other') && otherRestriction.trim() ? [otherRestriction.trim()] : [])
        ].join(', ');

        setSaving(true);
        try {
            await updateUserProfile(user.uid, {
                name: name.trim(),
                dietaryRestrictions: finalRestrictions || undefined,
                foodsDisliked: foodsDisliked.trim() || undefined,
                primaryGoal: primaryGoal || undefined,
            });
            navigation.navigate('OnboardingComplete');
        } catch (error) {
            console.error("Failed to save profile:", error);
            Alert.alert("Error", "Could not save your profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const toggleRestriction = (restriction: string) => {
        if (selectedRestrictions.includes(restriction)) {
            setSelectedRestrictions(prev => prev.filter(r => r !== restriction));
        } else {
            setSelectedRestrictions(prev => [...prev, restriction]);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    style={styles.container} 
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
            <Text style={styles.title}>Let's get to know you</Text>
            <Text style={styles.subtitle}>
                Customize your experience by sharing a bit about yourself.
            </Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>What should we call you? *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Your Name"
                    value={name}
                    onChangeText={setName}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Primary Goal</Text>
                <View style={styles.goalsContainer}>
                    {GOAL_OPTIONS.map((goal) => (
                        <TouchableOpacity
                            key={goal}
                            style={[
                                styles.goalButton,
                                primaryGoal === goal && styles.goalButtonSelected
                            ]}
                            onPress={() => setPrimaryGoal(goal)}
                        >
                            <Text style={[
                                styles.goalText,
                                primaryGoal === goal && styles.goalTextSelected
                            ]}>
                                {goal}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Dietary Restrictions & Allergies</Text>
                <View style={styles.goalsContainer}>
                    {DIETARY_OPTIONS.map((restriction) => (
                        <TouchableOpacity
                            key={restriction}
                            style={[
                                styles.goalButton,
                                selectedRestrictions.includes(restriction) && styles.goalButtonSelected
                            ]}
                            onPress={() => toggleRestriction(restriction)}
                        >
                            <Text style={[
                                styles.goalText,
                                selectedRestrictions.includes(restriction) && styles.goalTextSelected
                            ]}>
                                {restriction}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {selectedRestrictions.includes('Other') && (
                    <TextInput
                        style={[styles.input, { marginTop: 12 }]}
                        placeholder="Please specify other restrictions"
                        value={otherRestriction}
                        onChangeText={setOtherRestriction}
                    />
                )}
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Foods Disliked (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Mushrooms, Olives"
                    value={foodsDisliked}
                    onChangeText={setFoodsDisliked}
                />
            </View>

            <TouchableOpacity 
                style={[styles.button, saving && styles.buttonDisabled]} 
                onPress={handleNext}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.buttonText}>Continue</Text>
                )}
            </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 48,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 32,
        lineHeight: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1e293b',
    },
    goalsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    goalButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
        marginRight: 8,
    },
    goalButtonSelected: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    goalText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    goalTextSelected: {
        color: '#2563eb',
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
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
