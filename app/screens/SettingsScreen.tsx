import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { updateUserProfile, saveLocalPII, getLocalPII, getUserProfile, UserProfile, isInternalUser } from '../../src/services/userProfile';
import { auth, db } from '../../src/services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { LogOut, ChevronLeft, Save, Search, X } from 'lucide-react-native';
import { ChipSelect } from '../components/ChipSelect';
import { ingredientService } from '../../src/services/IngredientService';
import { StorageService } from '../../src/services/storage';
import { Ingredient } from '../../src/models/Ingredient';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

type Props = {
    navigation: SettingsScreenNavigationProp;
};

import { 
    GOAL_OPTIONS, 
    SYMPTOM_GROUPS, 
    DIET_GROUPS, 
    FREQUENCY_OPTIONS 
} from '../constants/options';

export default function SettingsScreen({ navigation }: Props) {
    const [name, setName] = useState('');
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
    const [selectedSensitivities, setSelectedSensitivities] = useState<string[]>([]);
    const [avoidedFoods, setAvoidedFoods] = useState<string[]>([]);
    const [symptomFrequency, setSymptomFrequency] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Ingredient[]>([]);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const [localPII, profile] = await Promise.all([
                getLocalPII(user.uid),
                getUserProfile(user.uid)
            ]);

            if (localPII.name) setName(localPII.name);
            
            if (profile) {
                if (profile.goals) setSelectedGoals(profile.goals);
                if (profile.symptoms) setSelectedSymptoms(profile.symptoms);
                if (profile.allergies) setSelectedAllergies(profile.allergies);
                if (profile.dietaryPreferences) setSelectedPreferences(profile.dietaryPreferences);
                if (profile.sensitivities) setSelectedSensitivities(profile.sensitivities);
                if (profile.avoidedFoods) setAvoidedFoods(profile.avoidedFoods);
                if (profile.symptomFrequency) setSymptomFrequency(profile.symptomFrequency);
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
            Alert.alert("Error", "Could not load your profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Required", "Please tell us your name.");
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        setSaving(true);
        try {
            await saveLocalPII(user.uid, { name: name.trim() });

            const profileUpdates: Partial<UserProfile> = {
                goals: selectedGoals,
                symptoms: selectedSymptoms,
                allergies: selectedAllergies,
                dietaryPreferences: selectedPreferences,
                sensitivities: selectedSensitivities,
                avoidedFoods: avoidedFoods,
                symptomFrequency: symptomFrequency,
                updatedAt: Date.now()
            };

            await updateUserProfile(user.uid, profileUpdates);
            Alert.alert("Success", "Your preferences have been updated.");
            navigation.goBack();
        } catch (error) {
            console.error("Failed to save profile:", error);
            Alert.alert("Error", "Could not save your preferences.");
        } finally {
            setSaving(false);
        }
    };
    
    const handleLogout = async () => {
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color="#1e293b" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Preferences</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                    {saving ? <ActivityIndicator size="small" color="#3b82f6" /> : <Save color="#3b82f6" size={24} />}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    style={styles.container} 
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
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
                        <Text style={styles.label}>Primary Goals (up to 3)</Text>
                        <ChipSelect
                            options={GOAL_OPTIONS}
                            selectedOptions={selectedGoals}
                            onToggle={(item) => toggleItem(selectedGoals, setSelectedGoals, item, 3)}
                            maxSelections={3}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Symptoms to Understand</Text>
                        {SYMPTOM_GROUPS.map((group) => (
                            <ChipSelect
                                key={group.category}
                                category={group.categoryLabel}
                                options={group.options}
                                selectedOptions={selectedSymptoms}
                                onToggle={(item) => toggleItem(selectedSymptoms, setSelectedSymptoms, item)}
                            />
                        ))}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Dietary Restrictions & Sensitivities</Text>
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
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Foods Avoided</Text>
                        <View style={styles.searchContainer}>
                            <Search size={20} color="#64748b" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search ingredients"
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Symptom Frequency</Text>
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

                    <View style={styles.divider} />

                    <TouchableOpacity 
                        style={styles.logoutButton} 
                        onPress={handleLogout}
                    >
                        <LogOut color="#ef4444" size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </TouchableOpacity>

                    <View style={styles.versionFooter}>
                        <Text style={styles.versionText}>Version 1.0.0 (Beta)</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 8 : 0,
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
    saveButton: {
        padding: 4,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 48,
    },
    inputGroup: {
        marginBottom: 32,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#1e293b',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1e293b',
    },
    resultsContainer: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        marginBottom: 12,
    },
    resultItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resultText: {
        fontSize: 15,
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
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        gap: 4,
    },
    avoidedText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    frequencyList: {
        gap: 10,
    },
    frequencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
    },
    frequencyItemSelected: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    frequencyText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#334155',
    },
    frequencyTextSelected: {
        color: '#2563eb',
        fontWeight: '700',
    },
    radioEmpty: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#cbd5e1',
    },
    radioFilled: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 5,
        borderColor: '#3b82f6',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 24,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    logoutButtonText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },
    versionFooter: {
        marginTop: 32,
        alignItems: 'center',
    },
    versionText: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '500',
    },
});
