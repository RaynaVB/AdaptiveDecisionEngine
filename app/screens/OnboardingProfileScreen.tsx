import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile, saveLocalPII } from '../../src/services/userProfile';
import { auth } from '../../src/services/firebaseConfig';
import { ChipSelect } from '../components/ChipSelect';
import { ingredientService } from '../../src/services/IngredientService';
import { Ingredient } from '../../src/models/Ingredient';
import { ChevronRight, ChevronLeft, Search, X } from 'lucide-react-native';

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
                        <Text style={styles.subtitle}>Search for specific ingredients icons you dislike or avoid.</Text>
                        
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#64748b" style={styles.searchIcon} />
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
                                        <X size={16} color="#64748b" />
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
        <SafeAreaView style={styles.safeArea}>
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
                            <ChevronLeft size={24} color="#64748b" />
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
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <>
                                <Text style={styles.nextButtonText}>{step === 5 ? "Finish" : "Next"}</Text>
                                <ChevronRight size={24} color="#ffffff" />
                            </>
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
        backgroundColor: '#ffffff',
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
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3b82f6',
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
        textAlign: 'right',
    },
    stepContainer: {
        flex: 1,
        paddingTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 32,
        lineHeight: 24,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: '#1e293b',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1e293b',
    },
    resultsContainer: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    resultItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resultText: {
        fontSize: 16,
        color: '#334155',
    },
    avoidedChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    avoidedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 6,
    },
    avoidedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    frequencyList: {
        gap: 12,
    },
    frequencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
    },
    frequencyItemSelected: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    frequencyText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
    },
    frequencyTextSelected: {
        color: '#2563eb',
        fontWeight: '700',
    },
    radioEmpty: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#cbd5e1',
    },
    radioFilled: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 6,
        borderColor: '#3b82f6',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#ffffff',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    nextButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 120,
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#93c5fd',
    },
    nextButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
