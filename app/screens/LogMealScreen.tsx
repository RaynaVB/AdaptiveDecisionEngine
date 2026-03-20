import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { Camera, X, Check, Plus, ChevronDown, Search } from 'lucide-react-native';
import { Modal } from 'react-native';
import { useEffect } from 'react';
import { Ingredient } from '../../src/models/Ingredient';
import { MealIngredientStatus } from '../../src/models/types';


import { RootStackParamList } from '../../src/models/navigation';
import { MealSlot, MealEvent, MealReason, ConfirmedIngredient, MealQuestion } from '../../src/models/types';

import { StorageService } from '../../src/services/storage';
import { NotificationService } from '../../src/services/NotificationService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { analyzeFoodImage, uploadImageToFirebase, VisionAnalysisResult } from '../../src/services/visionService';
import { auth } from '../../src/services/firebaseConfig';
import { ingredientService } from '../../src/services/IngredientService';
import { RecommendationService } from '../../src/services/recommendationService';

type LogMealScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LogMeal'>;

type LoggingState = 'idle' | 'image_selected' | 'uploading' | 'analyzing' | 'review_ready' | 'saving' | 'saved' | 'failed';


const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const determineMealSlot = (date: Date): MealSlot => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 17) return 'snack';
    if (hour >= 17 && hour < 22) return 'dinner';
    return 'snack';
};

export default function LogMealScreen() {
    const navigation = useNavigation<LogMealScreenNavigationProp>();

    const [textDescription, setTextDescription] = useState('');
    const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
    const [selectedSlot, setSelectedSlot] = useState<MealSlot>(determineMealSlot(new Date())); 
    const [selectedReason, setSelectedReason] = useState<MealReason | undefined>(undefined);

    const [occurredAt, setOccurredAt] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [loggingState, setLoggingState] = useState<LoggingState>('idle');
    const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
    const [confirmedDish, setConfirmedDish] = useState<{ id?: string; label: string } | null>(null);
    const [ingredients, setIngredients] = useState<ConfirmedIngredient[]>([]);
    const [analysisQuestions, setAnalysisQuestions] = useState<MealQuestion[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const isSaveDisabled = isSaving || 
                           loggingState === 'analyzing' || 
                           (photoUri && loggingState !== 'review_ready') || 
                           (!photoUri && !textDescription.trim());


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

    const renderReviewSection = () => {
        if (loggingState !== 'review_ready') return null;

        const confirmedIngs = ingredients.filter(i => i.confirmedStatus !== 'removed' && i.confirmedStatus !== 'suggested');
        const suggestedIngs = ingredients.filter(i => i.confirmedStatus === 'suggested');

        return (
            <View style={styles.reviewContainer}>
                {/* Dish Section is now integrated with the main input view when photo exists */}

                {/* Ingredients */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    
                    {confirmedIngs.length > 0 && (
                        <>
                            <Text style={styles.subTitle}>Confirmed</Text>
                            <View style={styles.ingredientsRow}>
                                {confirmedIngs.map(ing => (
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

                    {suggestedIngs.length > 0 && (
                        <>
                            <Text style={[styles.subTitle, { marginTop: 12 }]}>Check these (likely present)</Text>
                            <View style={styles.ingredientsRow}>
                                {suggestedIngs.map(ing => (
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
                </View>

                {/* Questions */}
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
            </View>
        );
    };

    const renderSearchModal = () => (
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
    );


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
        if (selectedDate) {
            setOccurredAt(selectedDate);
            setSelectedSlot(determineMealSlot(selectedDate));
        }
    };

    const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS !== 'ios') {
            toggleTimePicker(false);
        }
        if (selectedDate) {
            setOccurredAt(selectedDate);
            setSelectedSlot(determineMealSlot(selectedDate));
        }
    };

    const pickImage = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert('Permission needed', 'Camera permission is required to take photos.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: 'images',
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.4,
                    base64: true,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: 'images',
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.4,
                    base64: true,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedAsset = result.assets[0];
                setPhotoUri(selectedAsset.uri);
                setLoggingState('image_selected');

                if (selectedAsset.base64) {
                    try {
                        setLoggingState('analyzing');
                        setStatusMessage('Identifying dish...');
                        
                        const analysis = await analyzeFoodImage(selectedAsset.base64, 'image/jpeg');

                        if (!analysis.isFood) {
                            setLoggingState('idle');
                            setStatusMessage('');
                            Alert.alert("Non-food Image", "This doesn't look like food. Please try a different photo or enter a text description.");
                            return;
                        }

                        setStatusMessage('Extracting ingredients...');
                        setAnalysisResult(analysis);
                        
                        if (analysis.description && !selectedAsset.uri) {
                            setTextDescription(prev => prev ? `${prev}\n${analysis.description}` : analysis.description);
                        }
                        
                        // Map Dish
                        const resolvedDish = ingredientService.resolveDish(analysis.dishName);
                        setConfirmedDish(resolvedDish ? { id: resolvedDish.dishId, label: resolvedDish.dishLabel } : { label: analysis.dishName });

                        setStatusMessage('Checking for allergens...');

                        // Map Ingredients
                        const visibleIngs = ingredientService.resolveIngredients(analysis.visibleComponents);
                        const suggestedIngs = ingredientService.resolveIngredients(analysis.suggestedIngredients);

                        const initialIngredients: ConfirmedIngredient[] = [];
                        
                        visibleIngs.forEach(ing => {
                            initialIngredients.push({
                                ingredientId: ing.ingredient_id,
                                canonicalName: ing.canonical_name,
                                confirmedStatus: 'confirmed',
                                source: 'visible',
                                confidence: 0.95
                            });
                        });

                        suggestedIngs.forEach(ing => {
                            if (!initialIngredients.find(i => i.ingredientId === ing.ingredient_id)) {
                                initialIngredients.push({
                                    ingredientId: ing.ingredient_id,
                                    canonicalName: ing.canonical_name,
                                    confirmedStatus: 'suggested',
                                    source: 'inferred_dish_prior',
                                    confidence: 0.8
                                });
                            }
                        });

                        setIngredients(initialIngredients);

                        // Map Questions
                        setAnalysisQuestions(analysis.potentialQuestions.map(q => ({
                            questionId: q.id,
                            text: q.text,
                            answer: ''
                        })));

                        setStatusMessage('');
                        setLoggingState('review_ready');
                    } catch (error) {
                        console.error('Vision API Error:', error);
                        setLoggingState('failed');
                    }
                }
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSave = async () => {
        if (!textDescription && !photoUri) {
            Alert.alert('Required', 'Please add a photo or text description.');
            return;
        }

        setIsSaving(true);
        const mealId = uuidv4();

        const newMeal: MealEvent = {
            id: mealId,
            createdAt: new Date().toISOString(),
            occurredAt: occurredAt.toISOString(),
            mealSlot: selectedSlot,
            inputMode: photoUri ? 'photo' : 'text',
            mealReason: selectedReason,
            mealTypeTags: [], 
            tags: [], 
            
            // Canonical data
            dishId: confirmedDish?.id,
            dishLabel: confirmedDish?.label,
            confirmedIngredients: ingredients,
            questions: analysisQuestions,
        };


        if (textDescription) {
            newMeal.textDescription = textDescription;
            newMeal.raw_text = textDescription;
        }

        try {
            if (photoUri) {
                // Upload image to Firebase Storage
                const userId = auth.currentUser?.uid || 'anonymous';
                const remoteUrl = await uploadImageToFirebase(photoUri, mealId, userId);
                newMeal.photoUri = remoteUrl;
            }

            await StorageService.addMealEvent(newMeal);
            await NotificationService.handleUserLoggedActivity('meal');
            
            // Trigger recommendation recompute in background
            RecommendationService.recomputeRecommendations('meal_logged')
                .catch(err => console.error("Failed to recompute recommendations:", err));

        } catch (error) {
            console.error("Save Error", error);
            Alert.alert("Error", "Failed to clear the save process to server.")
        } finally {
            setIsSaving(false);
        }

        Alert.alert(
            'Meal Saved',
            'Log mood now?',
            [
                {
                    text: 'Not Now',
                    style: 'cancel',
                    onPress: () => navigation.popToTop()
                },
                {
                    text: 'Log Mood',
                    onPress: () => navigation.navigate('LogMood', { mealId: newMeal.id, timestamp: newMeal.occurredAt })
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >

                {/* Photo / Text Section */}
                <View style={styles.inputSection}>
                    <View style={styles.imageRow}>
                        <TouchableOpacity style={styles.cameraButton} onPress={() => pickImage(true)}>
                            <Camera color="#2563eb" size={24} />
                            <Text style={styles.cameraButtonText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cameraButton} onPress={() => pickImage(false)}>
                            <Text style={styles.cameraButtonText}>Library</Text>
                        </TouchableOpacity>
                    </View>

                    {photoUri && (
                        <View style={styles.photoPreviewContainer}>
                            <Image source={{ uri: photoUri }} style={[styles.photoPreview, loggingState === 'analyzing' && { opacity: 0.5 }]} />
                            <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(undefined)}>
                                <X color="#fff" size={16} />
                            </TouchableOpacity>
                            {loggingState === 'analyzing' && (
                                <View style={styles.analyzingOverlay}>
                                    <ActivityIndicator size="large" color="#2563eb" />
                                    <Text style={styles.analyzingText}>{statusMessage || 'Analyzing...'}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {!photoUri ? (
                        <TextInput
                            style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }, loggingState === 'analyzing' && { backgroundColor: '#f9fafb' }]}
                            placeholder={loggingState === 'analyzing' ? "AI is describing your food..." : "What did you eat?"}
                            value={textDescription}
                            onChangeText={setTextDescription}
                            multiline={true}
                            editable={loggingState !== 'analyzing'}
                        />
                    ) : (
                        loggingState === 'review_ready' && confirmedDish && (
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

                {renderReviewSection()}


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

            </ScrollView>

            {renderSearchModal()}

            <View style={styles.footer}>

                <TouchableOpacity 
                    style={[styles.saveButton, isSaveDisabled && { backgroundColor: '#94a3b8' }]} 
                    onPress={handleSave} 
                    disabled={isSaveDisabled}
                >
                    <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Meal'}</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#111827' },
    subTitle: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#4b5563' },

    inputSection: { marginBottom: 24 },
    imageRow: { flexDirection: 'row', marginBottom: 12 },
    cameraButton: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#eff6ff', padding: 8, borderRadius: 8, marginRight: 12
    },
    cameraButtonText: { marginLeft: 6, color: '#2563eb', fontWeight: '500' },
    textInput: {
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
        padding: 12, fontSize: 16, minHeight: 48
    },
    photoPreviewContainer: { marginBottom: 12, position: 'relative', width: '100%' },
    photoPreview: { width: '100%', height: 200, borderRadius: 12 },
    analyzingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 12,
    },
    analyzingText: { color: '#1e3a8a', fontWeight: 'bold', fontSize: 16, marginTop: 12 },
    removePhoto: {
        position: 'absolute', top: -6, right: -6, backgroundColor: '#ef4444',
        borderRadius: 12, padding: 4
    },


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

    footer: {
        padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff'
    },
    saveButton: {
        backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16,
        alignItems: 'center'
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    dishNameContainer: { marginTop: 12 },
    dishNameLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
    dishNameInput: { fontSize: 24, fontWeight: '700', color: '#111827', paddingVertical: 4 },


    reviewContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16 },
    dishCard: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
    dishLabel: { fontSize: 18, fontWeight: '700', color: '#111827' },
    
    ingredientsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ingredientChipConfirmed: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 
    },
    ingredientTextConfirmed: { color: '#fff', fontSize: 14, fontWeight: '500' },
    ingredientChipSuggested: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#2563eb',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 
    },
    ingredientTextSuggested: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
    addChip: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#eff6ff', borderStyle: 'dashed', borderWidth: 1, borderColor: '#2563eb',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 
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

