import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { Camera, X, Check, Plus, ChevronDown, Search, Image as ImageIcon, Utensils, Clock, Users, Moon, Meh, Zap } from 'lucide-react-native';
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
import { Colors, Typography, Radii, Shadows, Spacing } from '../constants/Theme';

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
                                        <X color={Colors.onPrimaryContrast} size={14} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.addChip} onPress={() => setShowSearchModal(true)}>
                                    <Plus color={Colors.primary} size={16} />
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
                                        <Check color={Colors.primary} size={14} style={{ marginRight: 4 }} />
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
                        <X color={Colors.onSurface} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Add Ingredient</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.searchBarContainer}>
                    <Search color={Colors.onSurfaceVariant} size={20} style={{ marginLeft: 12 }} />
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
                            <Plus color={Colors.primary} size={20} />
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

            // Navigate back immediately without prompt
            navigation.popToTop();

        } catch (error) {
            console.error("Save Error", error);
            Alert.alert("Error", "Failed to clear the save process to server.")
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Log your meal</Text>
                    <Text style={styles.headerSubtitle}>
                        Take a picture of your meal or upload an image and we'll help you identify it.
                    </Text>
                </View>

                {/* Photo Section */}
                <View style={styles.inputSection}>
                    {!photoUri ? (
                        <TouchableOpacity
                            style={styles.imagePlaceholder}
                            onPress={() => pickImage(true)}
                        >
                            <Image
                                source={require('../../assets/meal_placeholder_bg.png')}
                                style={styles.placeholderBg}
                            />
                            <View style={styles.placeholderOverlay} />
                            <View style={styles.placeholderContent}>
                                <Camera color={Colors.onPrimaryContrast} size={48} strokeWidth={1} />
                                <Text style={styles.placeholderText}>Tap to capture or select meal photo</Text>
                            </View>
                            <View style={styles.pillToggleContainer}>
                                <View style={styles.pillToggle}>
                                    <View style={[styles.pillIcon, { backgroundColor: Colors.primary }]}>
                                        <Camera color={Colors.onPrimaryContrast} size={20} />
                                    </View>
                                    <TouchableOpacity style={styles.pillIcon} onPress={() => pickImage(false)}>
                                        <ImageIcon color={Colors.onSurfaceVariant} size={20} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.photoPreviewContainer}>
                            <Image source={{ uri: photoUri }} style={[styles.photoPreview, loggingState === 'analyzing' && { opacity: 0.5 }]} />

                            {/* Focus Corners Overlay */}
                            <View style={styles.focusCorners}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>

                            <View style={styles.pillToggleContainer}>
                                <View style={styles.pillToggle}>
                                    <TouchableOpacity style={styles.pillIcon} onPress={() => pickImage(true)}>
                                        <Camera color={Colors.onSurfaceVariant} size={20} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.pillIcon} onPress={() => pickImage(false)}>
                                        <ImageIcon color={Colors.onSurfaceVariant} size={20} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(undefined)}>
                                <X color={Colors.onPrimaryContrast} size={16} />
                            </TouchableOpacity>

                            {loggingState === 'analyzing' && (
                                <View style={styles.analyzingOverlay}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                    <Text style={styles.analyzingText}>{statusMessage || 'Analyzing...'}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Dish Name (Adjustable during review) */}
                    {loggingState === 'review_ready' && confirmedDish && (
                        <View style={styles.dishNameContainer}>
                            <Text style={styles.dishNameLabel}>Detected Dish</Text>
                            <TextInput
                                style={styles.dishNameInput}
                                value={confirmedDish.label}
                                onChangeText={(newLabel) => setConfirmedDish({ ...confirmedDish, label: newLabel })}
                            />
                        </View>
                    )}
                </View>

                {renderReviewSection()}


                {/* Why are you eating? / Emotional Driver */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Emotional Driver</Text>
                    <View style={styles.emotionalGrid}>
                        {[
                            { id: 'hungry', label: 'Hungry' },
                            { id: 'meal_time', label: "Meal Time" },
                            { id: 'social', label: 'Social' },
                            { id: 'late_night', label: 'Late Night' },
                            { id: 'boredom', label: 'Boredom' },
                            { id: 'craving', label: 'Craving' },
                        ].map(reason => {
                            const isSelected = selectedReason === reason.id;
                            return (
                                <TouchableOpacity
                                    key={reason.id}
                                    style={[styles.emotionalCard, isSelected && styles.emotionalCardSelected]}
                                    onPress={() => setSelectedReason(reason.id as MealReason)}
                                >
                                    <Text style={[styles.emotionalText, isSelected && styles.emotionalTextSelected]}>
                                        {reason.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
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
                    style={[styles.saveButton, isSaveDisabled && { backgroundColor: Colors.outline }]}
                    onPress={handleSave}
                    disabled={isSaveDisabled}
                >
                    <View style={styles.saveButtonContent}>
                        {!isSaving && <Check color={Colors.onPrimaryContrast} size={20} strokeWidth={3} style={{ marginRight: 8 }} />}
                        <Text style={styles.saveButtonText}>{isSaving ? 'SAVING...' : 'CONFIRM LOG'}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: 16, paddingBottom: 100 },
    header: { marginBottom: 24, marginTop: 8 },
    headerTitle: { ...Typography.headline, fontSize: 32, marginBottom: 8, color: Colors.onSurface },
    headerSubtitle: { ...Typography.body, fontSize: 16, color: Colors.onSurfaceVariant, lineHeight: 22 },

    section: { marginBottom: 32 },
    sectionTitle: { ...Typography.label, fontSize: 12, marginBottom: 16, color: Colors.onSurfaceVariant, letterSpacing: 1 },
    subTitle: { ...Typography.label, fontSize: 14, marginBottom: 8, color: Colors.onSurfaceVariant },

    inputSection: { marginBottom: 32 },
    imagePlaceholder: {
        width: '100%',
        height: 240,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: Radii.xl,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        overflow: 'hidden',
        position: 'relative',
    },
    placeholderBg: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    placeholderContent: { alignItems: 'center', gap: 12, zIndex: 1 },
    placeholderText: { color: Colors.onPrimaryContrast, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40, zIndex: 1 },
    textInput: {
        borderWidth: 1, borderColor: Colors.surfaceContainer, borderRadius: Radii.md,
        padding: 12, fontSize: 16, minHeight: 48, color: Colors.onSurface,
        backgroundColor: Colors.surfaceLowest
    },

    photoPreviewContainer: {
        width: '100%',
        height: 240,
        borderRadius: Radii.xl,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: Colors.surfaceContainerLow,
    },
    photoPreview: { width: '100%', height: '100%' },

    focusCorners: { ...StyleSheet.absoluteFillObject, padding: 20 },
    corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.primary, opacity: 0.5 },
    topLeft: { top: 20, left: 20, borderLeftWidth: 2, borderTopWidth: 2 },
    topRight: { top: 20, right: 20, borderRightWidth: 2, borderTopWidth: 2 },
    bottomLeft: { bottom: 20, left: 20, borderLeftWidth: 2, borderBottomWidth: 2 },
    bottomRight: { bottom: 20, right: 20, borderRightWidth: 2, borderBottomWidth: 2 },

    pillToggleContainer: {
        position: 'absolute',
        bottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    pillToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 4,
        borderRadius: 30,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    pillIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    analyzingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    analyzingText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16, marginTop: 12 },
    removePhoto: {
        position: 'absolute', top: 12, right: 12, backgroundColor: Colors.error,
        borderRadius: 12, padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },


    dateTimeButton: {
        flex: 1,
        backgroundColor: Colors.surfaceContainerLow,
        paddingVertical: 12,
        borderRadius: Radii.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.surfaceContainer
    },
    dateTimeText: { color: Colors.onSurface, fontSize: 16, fontWeight: '500' },
    iosPickerContainer: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.lg, marginTop: 8, overflow: 'hidden' },
    iosPickerDoneButton: { padding: 12, alignItems: 'center', backgroundColor: Colors.surfaceContainer, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    iosPickerDoneText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },

    emotionalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between'
    },
    emotionalCard: {
        width: '31%',
        height: 60,
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.lg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    emotionalCardSelected: {
        backgroundColor: Colors.primaryContainer,
        borderColor: Colors.primary,
    },
    emotionalText: {
        fontSize: 12,
        color: Colors.onSurfaceVariant,
        fontWeight: '600',
        textAlign: 'center'
    },
    emotionalTextSelected: {
        color: Colors.primary,
    },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    tagChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: Colors.surfaceContainerLow, marginRight: 8, marginBottom: 8,
        borderWidth: 1, borderColor: 'transparent'
    },
    tagChipSelected: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primary },
    tagText: { fontSize: 14, color: Colors.onSurface, textTransform: 'capitalize' },
    tagTextSelected: { color: Colors.primary, fontWeight: '500' },

    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainer,
        backgroundColor: Colors.surfaceLowest,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radii.lg,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: Colors.onPrimaryContrast,
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    hipaaText: {
        marginTop: 16,
        textAlign: 'center',
        fontSize: 10,
        color: Colors.outline,
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    dishNameContainer: { marginTop: 12 },
    dishNameLabel: { ...Typography.label, fontSize: 12, color: Colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 4 },
    dishNameInput: { ...Typography.title, fontSize: 24, color: Colors.onSurface, paddingVertical: 4 },


    reviewContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.surfaceContainer, paddingTop: 16 },
    dishCard: { backgroundColor: Colors.surfaceContainerLow, padding: 16, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.surfaceContainer },
    dishLabel: { ...Typography.title, fontSize: 18, color: Colors.onSurface },

    ingredientsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    ingredientChipConfirmed: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.primaryContainer,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1, borderColor: Colors.primary,
    },
    ingredientTextConfirmed: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
    ingredientChipSuggested: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surfaceLowest, borderWidth: 1, borderColor: Colors.surfaceContainer,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20
    },
    ingredientTextSuggested: { color: Colors.onSurfaceVariant, fontSize: 13, fontWeight: '500' },
    addChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surfaceLowest, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.primary,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20
    },
    addChipText: { color: Colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 4 },

    questionCard: {
        backgroundColor: Colors.surfaceLowest,
        padding: 20,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    questionText: { ...Typography.title, fontSize: 15, color: Colors.onSurface, marginBottom: 16, lineHeight: 20 },
    questionOptions: { flexDirection: 'row', gap: 10 },
    optionChip: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    optionChipSelected: {
        backgroundColor: Colors.primaryContainer,
        borderColor: Colors.primary
    },
    optionText: { color: Colors.onSurfaceVariant, fontWeight: '600', fontSize: 13 },
    optionTextSelected: { color: Colors.primary, fontWeight: '700' },

    modalContainer: { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'ios' ? 40 : 0 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer },
    modalTitle: { ...Typography.title, fontSize: 18, color: Colors.onSurface },
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.lg, paddingRight: 12 },
    searchInput: { flex: 1, padding: 12, fontSize: 16, color: Colors.onSurface },
    resultsList: { flex: 1, paddingHorizontal: 16 },
    resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer },
    resultText: { fontSize: 16, color: Colors.onSurface },
    noResultsText: { textAlign: 'center', marginTop: 20, ...Typography.body, color: Colors.onSurfaceVariant },
});
