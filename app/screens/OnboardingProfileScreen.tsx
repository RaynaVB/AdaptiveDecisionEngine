import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile, saveLocalPII } from '../../src/services/userProfile';
import { auth } from '../../src/services/firebaseConfig';
import { ChipSelect } from '../components/ChipSelect';
import { ingredientService } from '../../src/services/IngredientService';
import { Ingredient } from '../../src/models/Ingredient';
import { ChevronRight, ChevronLeft, Search, X } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

type OnboardingProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingProfile'>;

type Props = {
    navigation: OnboardingProfileScreenNavigationProp;
};

import { 
    GOAL_OPTIONS, 
    SYMPTOM_GROUPS, 
    DIET_GROUPS, 
    FREQUENCY_OPTIONS 
} from '../constants/options';

export default function OnboardingProfileScreen({ navigation }: Props) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
    const [selectedSensitivities, setSelectedSensitivities] = useState<string[]>([]);
    const [avoidedFoods, setAvoidedFoods] = useState<string[]>([]);
    const [symptomFrequency, setSymptomFrequency] = useState('');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
    
    const [saving, setSaving] = useState(false);

    const handleNext = () => {
        if (step === 0 && !name.trim()) {
            Alert.alert("Required", "Please tell us your name.");
            return;
        }
        if (step === 1 && selectedGoals.length === 0) {
            Alert.alert("Required", "Please select at least one goal.");
            return;
        }
        if (step === 2 && selectedSymptoms.length === 0) {
            Alert.alert("Required", "Please select at least one symptom.");
            return;
        }
        if (step === 5 && !symptomFrequency) {
            Alert.alert("Required", "Please select how often you experience symptoms.");
            return;
        }

        if (step < 5) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleComplete = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setSaving(true);
        try {
            await saveLocalPII(user.uid, { name: name.trim() });

            await updateUserProfile(user.uid, {
                goals: selectedGoals,
                symptoms: selectedSymptoms,
                allergies: selectedAllergies,
                dietaryPreferences: selectedPreferences,
                sensitivities: selectedSensitivities,
                avoidedFoods: avoidedFoods,
                symptomFrequency: symptomFrequency,
                updatedAt: Date.now()
            });

            navigation.navigate('OnboardingComplete');
        } catch (error) {
            console.error("Failed to save profile:", error);
            Alert.alert("Error", "Could not save your profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const toggleItem = (list: string[], setList: (l: string[]) => void, item: string, max?: number) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            if (max && list.length >= max) return;
            setList([...list, item]);
        }
    };

    const searchIngs = (query: string) => {
        setSearchQuery(query);
        if (query.length > 1) {
            const results = ingredientService.searchIngredients(query);
            setSearchResults(results.slice(0, 5));
        } else {
            setSearchResults([]);
        }
    };

    const addAvoidedFood = (ingName: string) => {
        if (!avoidedFoods.includes(ingName)) {
            setAvoidedFoods([...avoidedFoods, ingName]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeAvoidedFood = (ingName: string) => {
        setAvoidedFoods(avoidedFoods.filter(f => f !== ingName));
    };

    const renderStep = () => {
        switch(step) {
            case 0:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Welcome!</Text>
                        <Text style={styles.subtitle}>First, what should we call you?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your Name"
                            value={name}
                            onChangeText={setName}
                            autoFocus
                        />
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>What would you like to improve?</Text>
                        <Text style={styles.subtitle}>Select up to 3 goals.</Text>
                        <ChipSelect
                            options={GOAL_OPTIONS}
                            selectedOptions={selectedGoals}
                            onToggle={(item) => toggleItem(selectedGoals, setSelectedGoals, item, 3)}
                            maxSelections={3}
                        />
                    </View>
                );
            case 2:
                return (
                    <ScrollView style={styles.stepContainer}>
                        <Text style={styles.title}>What symptoms do you want to understand?</Text>
                        <Text style={styles.subtitle}>These will be our primary focus.</Text>
                        {SYMPTOM_GROUPS.map((group) => (
                            <ChipSelect
                                key={group.category}
                                category={group.categoryLabel}
                                options={group.options}
                                selectedOptions={selectedSymptoms}
                                onToggle={(item) => toggleItem(selectedSymptoms, setSelectedSymptoms, item)}
                            />
                        ))}
                    </ScrollView>
                );
            case 3:
                return (
                    <ScrollView style={styles.stepContainer}>
                        <Text style={styles.title}>Dietary restrictions & sensitivities?</Text>
                        <Text style={styles.subtitle}>Help us identify safe vs. risky foods.</Text>
                        <ChipSelect
                            category={DIET_GROUPS[0].categoryLabel}
                            options={DIET_GROUPS[0].options}
                            selectedOptions={selectedAllergies}
                            onToggle={(item) => toggleItem(selectedAllergies, setSelectedAllergies, item)}
                        />
                        <ChipSelect
                            category={DIET_GROUPS[1].categoryLabel}
                            options={DIET_GROUPS[1].options}
                            selectedOptions={selectedPreferences}
                            onToggle={(item) => toggleItem(selectedPreferences, setSelectedPreferences, item)}
                        />
                        <ChipSelect
                            category={DIET_GROUPS[2].categoryLabel}
                            options={DIET_GROUPS[2].options}
                            selectedOptions={selectedSensitivities}
                            onToggle={(item) => toggleItem(selectedSensitivities, setSelectedSensitivities, item)}
                        />
                    </ScrollView>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Any foods you avoid?</Text>
                        <Text style={styles.subtitle}>Search for specific ingredients you dislike or avoid.</Text>
                        
                        <View style={styles.searchContainer}>
                            <Search size={20} color={Colors.onSurfaceVariant} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search ingredients (e.g. Garlic, Cilantro)"
                                value={searchQuery}
                                onChangeText={searchIngs}
                            />
                        </View>

                        {searchResults.length > 0 && (
                            <View style={styles.resultsContainer}>
                                {searchResults.map(ing => (
                                    <TouchableOpacity 
                                        key={ing.ingredient_id} 
                                        style={styles.resultItem}
                                        onPress={() => addAvoidedFood(ing.display_name)}
                                    >
                                        <Text style={styles.resultText}>{ing.display_name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={styles.avoidedChips}>
                            {avoidedFoods.map(food => (
                                <View key={food} style={styles.avoidedChip}>
                                    <Text style={styles.avoidedText}>{food}</Text>
                                    <TouchableOpacity onPress={() => removeAvoidedFood(food)}>
                                        <X size={16} color={Colors.onSurfaceVariant} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>How often do you experience symptoms?</Text>
                        <Text style={styles.subtitle}>This helps us calibrate your frequency baseline.</Text>
                        <View style={styles.frequencyList}>
                            {FREQUENCY_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.frequencyItem,
                                        symptomFrequency === opt.value && styles.frequencyItemSelected
                                    ]}
                                    onPress={() => setSymptomFrequency(opt.value)}
                                >
                                    <Text style={[
                                        styles.frequencyText,
                                        symptomFrequency === opt.value && styles.frequencyTextSelected
                                    ]}>{opt.label}</Text>
                                    {symptomFrequency === opt.value && <View style={styles.radioFilled} />}
                                    {symptomFrequency !== opt.value && <View style={styles.radioEmpty} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((step + 1) / 6) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>Step {step + 1} of 6</Text>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    {renderStep()}
                </View>

                <View style={styles.footer}>
                    {step > 0 ? (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <ChevronLeft size={24} color={Colors.onSurfaceVariant} />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View />
                    )}

                    <TouchableOpacity 
                        style={[styles.nextButton, saving && styles.buttonDisabled]} 
                        onPress={handleNext}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={Colors.onPrimaryContrast} />
                        ) : (
                            <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>{step === 5 ? "Finish" : "Next"}</Text>
                                <ChevronRight size={24} color={Colors.onPrimaryContrast} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    progressContainer: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 20 : 16,
        paddingBottom: 16,
    },
    progressBar: {
        height: 6,
        backgroundColor: Colors.surfaceContainer,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    progressText: {
        ...Typography.label,
        fontSize: 10,
        fontWeight: '800',
        color: Colors.onSurfaceVariant,
        textAlign: 'right',
        opacity: 0.6,
    },
    stepContainer: {
        flex: 1,
        paddingTop: 20,
    },
    title: {
        ...Typography.headline,
        fontSize: 30,
        color: Colors.onSurface,
        marginBottom: 8,
    },
    subtitle: {
        ...Typography.body,
        fontSize: 16,
        color: Colors.onSurfaceVariant,
        marginBottom: 32,
        lineHeight: 24,
    },
    input: {
        ...Typography.body,
        backgroundColor: Colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        borderRadius: Radii.lg,
        padding: 16,
        fontSize: 18,
        color: Colors.onSurface,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        borderRadius: Radii.lg,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        ...Typography.body,
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.onSurface,
    },
    resultsContainer: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        borderRadius: Radii.lg,
        marginBottom: 16,
        ...Shadows.ambient,
    },
    resultItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainer,
    },
    resultText: {
        ...Typography.body,
        fontSize: 16,
        color: Colors.onSurface,
    },
    avoidedChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    avoidedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceContainer,
        borderRadius: Radii.full,
        paddingVertical: 8,
        paddingHorizontal: 14,
        gap: 6,
    },
    avoidedText: {
        ...Typography.label,
        fontSize: 12,
        fontWeight: '700',
        color: Colors.onSurface,
    },
    frequencyList: {
        gap: 12,
    },
    frequencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: Colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        borderRadius: Radii.xl,
    },
    frequencyItemSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primarySubtle,
    },
    frequencyText: {
        ...Typography.body,
        fontSize: 16,
        fontWeight: '500',
        color: Colors.onSurfaceVariant,
    },
    frequencyTextSelected: {
        color: Colors.primary,
        fontWeight: '800',
    },
    radioEmpty: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.surfaceContainer,
    },
    radioFilled: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 7,
        borderColor: Colors.primary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 44 : 32,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainer,
        backgroundColor: Colors.background,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backButtonText: {
        ...Typography.label,
        fontSize: 14,
        fontWeight: '700',
        color: Colors.onSurfaceVariant,
        letterSpacing: 0.5,
    },
    nextButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radii.full,
        paddingVertical: 14,
        paddingHorizontal: 28,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 140,
        justifyContent: 'center',
        ...Shadows.ambient,
    },
    buttonDisabled: {
        backgroundColor: Colors.surfaceContainerHighest,
        opacity: 0.6,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: Colors.onPrimaryContrast,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
