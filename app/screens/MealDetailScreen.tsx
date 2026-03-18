import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, LayoutAnimation } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MealSlot, MealReason, ConfirmedIngredient, MealQuestion, MealIngredientStatus } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { Trash2, X, Check, Plus, Search, Camera } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal } from 'react-native';
import { ingredientService } from '../../src/services/IngredientService';
import { Ingredient } from '../../src/models/Ingredient';

type MealDetailScreenRouteProp = RouteProp<RootStackParamList, 'MealDetail'>;
type MealDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealDetail'>;

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealDetailScreen() {
    const navigation = useNavigation<MealDetailScreenNavigationProp>();
    const route = useRoute<MealDetailScreenRouteProp>();
    const { mealId } = route.params;

    const [meal, setMeal] = useState<MealEvent | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [textDescription, setTextDescription] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch');
    const [selectedReason, setSelectedReason] = useState<MealReason | undefined>(undefined);
    
    // Canonical data
    const [confirmedDish, setConfirmedDish] = useState<{ id?: string; label: string } | null>(null);
    const [ingredients, setIngredients] = useState<ConfirmedIngredient[]>([]);
    const [analysisQuestions, setAnalysisQuestions] = useState<MealQuestion[]>([]);

    const [occurredAt, setOccurredAt] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Ingredient[]>([]);

    useEffect(() => {
        if (searchQuery.length > 1) {
            const results = ingredientService.searchIngredients(searchQuery);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const toggleDatePicker = (show: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDatePicker(show);
    };

    const toggleTimePicker = (show: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowTimePicker(show);
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS !== 'ios') {
            toggleDatePicker(false);
        }
        if (selectedDate) setOccurredAt(selectedDate);
    };

    const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS !== 'ios') {
            toggleTimePicker(false);
        }
        if (selectedDate) setOccurredAt(selectedDate);
    };

    useEffect(() => {
        loadMeal();
    }, [mealId]);

    const loadMeal = async () => {
        const meals = await StorageService.getMealEvents();
        const found = meals.find(m => m.id === mealId);
        if (found) {
            setMeal(found);
            setTextDescription(found.textDescription || '');
            setSelectedSlot(found.mealSlot);
            setSelectedReason(found.mealReason);
            setOccurredAt(new Date(found.occurredAt));
            
            // Populate canonical data
            setConfirmedDish(found.dishId || found.dishLabel ? { id: found.dishId, label: found.dishLabel || '' } : null);
            setIngredients(found.confirmedIngredients || []);
            setAnalysisQuestions(found.questions || []);
        } else {
            Alert.alert('Error', 'Meal not found');
            navigation.goBack();
        }
        setLoading(false);
    };

    const toggleIngredient = (id: string) => {
        setIngredients(prev => prev.map(ing => {
            if (ing.ingredientId === id) {
                const newStatus: MealIngredientStatus = (ing.confirmedStatus === 'removed' || ing.confirmedStatus === 'suggested') ? 'confirmed' : 'removed';
                return { ...ing, confirmedStatus: newStatus };
            }
            return ing;
        }));
    };

    const addIngredient = (ing: Ingredient) => {
        setIngredients(prev => {
            if (prev.find(i => i.ingredientId === ing.ingredient_id)) return prev;
            return [...prev, {
                ingredientId: ing.ingredient_id,
                canonicalName: ing.canonical_name,
                confirmedStatus: 'added',
                source: 'user_added',
                confidence: 1.0
            }];
        });
        setShowSearchModal(false);
        setSearchQuery('');
    };

    const updateQuestionAnswer = (id: string, answer: string) => {
        setAnalysisQuestions(prev => prev.map(q => q.questionId === id ? { ...q, answer } : q));
    };


    const handleSave = async () => {
        if (!meal) return;

        const updatedMeal: MealEvent = {
            ...meal,
            occurredAt: occurredAt.toISOString(),
            mealSlot: selectedSlot,
            textDescription: textDescription.trim(),
            mealReason: selectedReason,
            mealTypeTags: [], // Pruned
            dishId: confirmedDish?.id,
            dishLabel: confirmedDish?.label,
            confirmedIngredients: ingredients,
            questions: analysisQuestions,
        };

        await StorageService.updateMealEvent(updatedMeal);
        navigation.goBack();
    };

    const handleDelete = () => {
        Alert.alert('Delete Meal', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await StorageService.deleteMealEvent(mealId);
                    navigation.goBack();
                }
            }
        ]);
    };

    if (loading || !meal) return <View style={styles.container}><Text>Loading...</Text></View>;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {meal.photoUri && (
                    <Image source={{ uri: meal.photoUri }} style={styles.heroImage} />
                )}

                <View style={styles.inputSection}>
                    {!meal.photoUri ? (
                        <View style={styles.section}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={styles.textInput}
                                value={textDescription}
                                onChangeText={setTextDescription}
                                placeholder="Description..."
                                multiline
                            />
                        </View>
                    ) : (
                        confirmedDish && (
                            <View style={styles.dishNameContainer}>
                                <Text style={styles.dishNameLabel}>Dish Name</Text>
                                <TextInput
                                    style={styles.dishNameInput}
                                    value={confirmedDish.label}
                                    onChangeText={(newLabel) => setConfirmedDish({ ...confirmedDish, label: newLabel })}
                                />
                            </View>
                        )
                    )}
                </View>

                {/* Ingredients Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    
                    {ingredients.filter(i => i.confirmedStatus !== 'removed' && i.confirmedStatus !== 'suggested').length > 0 && (
                        <>
                            <Text style={styles.subTitle}>Confirmed</Text>
                            <View style={styles.ingredientsRow}>
                                {ingredients.filter(i => i.confirmedStatus !== 'removed' && i.confirmedStatus !== 'suggested').map(ing => (
                                    <TouchableOpacity 
                                        key={ing.ingredientId} 
                                        style={styles.ingredientChipConfirmed}
                                        onPress={() => toggleIngredient(ing.ingredientId)}
                                    >
                                        <Text style={styles.ingredientTextConfirmed}>{ing.canonicalName}</Text>
                                        <X color="#fff" size={14} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.addChip} onPress={() => setShowSearchModal(true)}>
                                    <Plus color="#2563eb" size={16} />
                                    <Text style={styles.addChipText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {ingredients.filter(i => i.confirmedStatus === 'suggested').length > 0 && (
                        <>
                            <Text style={[styles.subTitle, { marginTop: 12 }]}>Check these (likely present)</Text>
                            <View style={styles.ingredientsRow}>
                                {ingredients.filter(i => i.confirmedStatus === 'suggested').map(ing => (
                                    <TouchableOpacity 
                                        key={ing.ingredientId} 
                                        style={styles.ingredientChipSuggested}
                                        onPress={() => toggleIngredient(ing.ingredientId)}
                                    >
                                        <Check color="#2563eb" size={14} style={{ marginRight: 4 }} />
                                        <Text style={styles.ingredientTextSuggested}>{ing.canonicalName}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {ingredients.length === 0 && (
                        <TouchableOpacity style={styles.addChip} onPress={() => setShowSearchModal(true)}>
                            <Plus color="#2563eb" size={16} />
                            <Text style={styles.addChipText}>Add Ingredient</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Questions Section */}
                {analysisQuestions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Questions</Text>
                        {analysisQuestions.map((q, idx) => (
                            <View key={idx} style={styles.questionCard}>
                                <Text style={styles.questionText}>{q.text || "Unknown Question"}</Text>
                                <View style={styles.questionOptions}>
                                    {['Yes', 'No', 'Not sure'].map(opt => (
                                        <TouchableOpacity 
                                            key={opt}
                                            style={[styles.optionChip, q.answer === opt && styles.optionChipSelected]}
                                            onPress={() => updateQuestionAnswer(q.questionId, opt)}
                                        >
                                            <Text style={[styles.optionText, q.answer === opt && styles.optionTextSelected]}>{opt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Meal Date & Time */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>When did you eat?</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={styles.dateTimeButton} onPress={() => toggleDatePicker(!showDatePicker)}>
                            <Text style={styles.dateTimeText}>
                                {occurredAt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.dateTimeButton} onPress={() => toggleTimePicker(!showTimePicker)}>
                            <Text style={styles.dateTimeText}>
                                {occurredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {(Platform.OS === 'ios' || showDatePicker) && (
                        <View style={[
                            Platform.OS === 'ios' ? styles.iosPickerContainer : {},
                            Platform.OS === 'ios' && !showDatePicker ? { height: 0, marginTop: 0, overflow: 'hidden' } : {}
                        ]}>
                            <DateTimePicker
                                value={occurredAt}
                                mode="date"
                                display="spinner"
                                onChange={onDateChange}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity style={styles.iosPickerDoneButton} onPress={() => toggleDatePicker(false)}>
                                    <Text style={styles.iosPickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    {(Platform.OS === 'ios' || showTimePicker) && (
                         <View style={[
                            Platform.OS === 'ios' ? styles.iosPickerContainer : {},
                            Platform.OS === 'ios' && !showTimePicker ? { height: 0, marginTop: 0, overflow: 'hidden' } : {}
                        ]}>
                            <DateTimePicker
                                value={occurredAt}
                                mode="time"
                                display="spinner"
                                onChange={onTimeChange}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity style={styles.iosPickerDoneButton} onPress={() => toggleTimePicker(false)}>
                                    <Text style={styles.iosPickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Why are you eating? */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Why are you eating?</Text>
                    <View style={styles.tagsRow}>
                        {[
                            { id: 'hungry', label: 'Hungry' },
                            { id: 'meal_time', label: "It's Meal Time" },
                            { id: 'social', label: 'Social' },
                            { id: 'late_night', label: 'Late Night Stay' },
                            { id: 'boredom', label: 'Boredom' },
                            { id: 'craving', label: 'Craving' },
                        ].map(reason => (
                            <TouchableOpacity
                                key={reason.id}
                                style={[styles.tagChip, selectedReason === reason.id && styles.tagChipSelected]}
                                onPress={() => setSelectedReason(reason.id as MealReason)}
                            >
                                <Text style={[styles.tagText, selectedReason === reason.id && styles.tagTextSelected]}>
                                    {reason.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Tags removal - redundant */}

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Trash2 color="#ef4444" size={20} />
                    <Text style={styles.deleteText}>Delete Entry</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Search Modal */}
            <Modal visible={showSearchModal} animationType="slide" transparent={false}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                            <X color="#000" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Add Ingredient</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    
                    <View style={styles.searchBarContainer}>
                        <Search color="#6b7280" size={20} style={{ marginLeft: 12 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search ingredients..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                    </View>

                    <ScrollView style={styles.resultsList}>
                        {searchResults.map(ing => (
                            <TouchableOpacity 
                                key={ing.ingredient_id} 
                                style={styles.resultItem}
                                onPress={() => addIngredient(ing)}
                            >
                                <Text style={styles.resultText}>{ing.display_name}</Text>
                                <Plus color="#2563eb" size={20} />
                            </TouchableOpacity>
                        ))}
                        {searchQuery.length > 1 && searchResults.length === 0 && (
                            <Text style={styles.noResultsText}>No matches found</Text>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { padding: 16, paddingBottom: 100 },

    heroImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 20 },

    section: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '500', color: '#6b7280', marginBottom: 6 },
    textInput: {
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
        padding: 12, fontSize: 16
    },

    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#111827' },

    dateTimeButton: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    dateTimeText: { color: '#111827', fontSize: 16, fontWeight: '500' },
    iosPickerContainer: { backgroundColor: '#f9fafb', borderRadius: 12, marginTop: 8, overflow: 'hidden' },
    iosPickerDoneButton: { padding: 12, alignItems: 'center', backgroundColor: '#e5e7eb', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    iosPickerDoneText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    tagChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: '#f3f4f6', marginRight: 8, marginBottom: 8,
        borderWidth: 1, borderColor: 'transparent'
    },
    tagChipSelected: { backgroundColor: '#bfdbfe', borderColor: '#2563eb' },
    tagText: { fontSize: 14, color: '#374151', textTransform: 'capitalize' },
    tagTextSelected: { color: '#1e40af', fontWeight: '500' },

    deleteButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    deleteText: { color: '#ef4444', marginLeft: 8, fontSize: 16, fontWeight: '500' },

    footer: {
        padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff'
    },
    saveButton: {
        backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16,
        alignItems: 'center'
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // New Styles for refinement
    inputSection: { marginBottom: 24 },
    dishNameContainer: { marginTop: 12, marginBottom: 12 },
    dishNameLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
    dishNameInput: { fontSize: 24, fontWeight: '700', color: '#111827', paddingVertical: 4 },
    
    subTitle: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#4b5563' },
    ingredientsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ingredientChipConfirmed: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
        marginRight: 6, marginBottom: 6
    },
    ingredientTextConfirmed: { color: '#fff', fontSize: 14, fontWeight: '500' },
    ingredientChipSuggested: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#2563eb',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
        marginRight: 6, marginBottom: 6
    },
    ingredientTextSuggested: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
    addChip: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#eff6ff', borderStyle: 'dashed', borderWidth: 1, borderColor: '#2563eb',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
        marginBottom: 6
    },
    addChipText: { color: '#2563eb', fontSize: 14, fontWeight: '500', marginLeft: 4 },

    questionCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
    questionText: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 },
    questionOptions: { flexDirection: 'row', gap: 8 },
    optionChip: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
    optionChipSelected: { backgroundColor: '#bfdbfe' },
    optionText: { color: '#4b5563', fontWeight: '500' },
    optionTextSelected: { color: '#1e40af', fontWeight: '700' },

    modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 40 : 0 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#f3f4f6', borderRadius: 12, paddingRight: 12 },
    searchInput: { flex: 1, padding: 12, fontSize: 16 },
    resultsList: { flex: 1, paddingHorizontal: 16 },
    resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    resultText: { fontSize: 16, color: '#111827' },
    noResultsText: { textAlign: 'center', marginTop: 20, color: '#6b7280' },
});
