import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, ActivityIndicator, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { Camera, X, Check, Plus, ChevronDown, Search, Image as ImageIcon, Utensils, Clock, Users, Moon, Meh, Zap, Type, ImagePlus } from 'lucide-react-native';
import { Modal } from 'react-native';
import { useEffect } from 'react';
import { Ingredient } from '../../src/models/Ingredient';
import { MealIngredientStatus } from '../../src/models/types';


import { RootStackParamList } from '../../src/models/navigation';
import { MealSlot, MealEvent, MealReason, ConfirmedIngredient, MealQuestion } from '../../src/models/types';

import { StorageService } from '../../src/services/storage';
import { NotificationService } from '../../src/services/NotificationService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { analyzeFoodImage, analyzeFoodText, uploadImageToFirebase, VisionAnalysisResult } from '../../src/services/visionService';
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
    if (hour >= 17 && hour < 24) return 'dinner'; // Extended to midnight
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
    const [mealNameQuery, setMealNameQuery] = useState('');
    const [entryMethod, setEntryMethod] = useState<'none' | 'photo' | 'text'>('none');
    
    // Recipe Typeahead State
    const [allUserRecipes, setAllUserRecipes] = useState<any[]>([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);

    const isSaveDisabled = isSaving ||
        loggingState === 'analyzing' ||
        (photoUri && loggingState !== 'review_ready') ||
        (!photoUri && !textDescription.trim() && !mealNameQuery.trim());


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

    // Fetch all user recipes for typeahead on mount
    useEffect(() => {
        const fetchRecipes = async () => {
            const recipes = await StorageService.getAllRecipes();
            setAllUserRecipes(recipes);
        };
        fetchRecipes();
    }, []);

    // Filter suggestions based on query
    useEffect(() => {
        if (mealNameQuery.length > 0) {
            const filtered = allUserRecipes.filter(r => 
                r.dishLabel.toLowerCase().includes(mealNameQuery.toLowerCase())
            ).slice(0, 5); // Limit to top 5
            setFilteredSuggestions(filtered);
        } else {
            setFilteredSuggestions([]);
        }
    }, [mealNameQuery, allUserRecipes]);

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

                    <View style={styles.ingredientsRow}>
                        {confirmedIngs.length > 0 && confirmedIngs.map(ing => (
                            <TouchableOpacity
                                key={ing.ingredientId}
                                style={styles.ingredientChipConfirmed}
                                onPress={() => toggleIngredient(ing.ingredientId)}
                            >
                                <Text style={styles.ingredientTextConfirmed}>{ing.canonicalName}</Text>
                                <X color={Colors.onPrimaryContrast} size={14} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        ))}

                        {/* Always show Add chip in review state */}
                        <TouchableOpacity style={styles.addChip} onPress={() => setShowSearchModal(true)}>
                            <Plus color={Colors.primary} size={16} />
                            <Text style={styles.addChipText}>Add</Text>
                        </TouchableOpacity>
                    </View>

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

    const handleMethodSelect = (method: 'camera' | 'library' | 'text') => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (method === 'camera') {
            setEntryMethod('photo');
            pickImage(true);
        } else if (method === 'library') {
            setEntryMethod('photo');
            pickImage(false);
        } else {
            setEntryMethod('text');
        }
    };

    const resetEntryMethod = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setEntryMethod('none');
        setPhotoUri(undefined);
        setMealNameQuery('');
        setLoggingState('idle');
        setIngredients([]);
        setConfirmedDish(null);
    };

    const handleTextAnalysis = async (overrideName?: string) => {
        const query = overrideName || mealNameQuery;
        if (!query.trim()) return;

        Keyboard.dismiss();

        try {
            setLoggingState('analyzing');
            setStatusMessage('Searching your library...');

            // 1. Check Recipe Library first
            const previousRecipe = await StorageService.getRecipe(query);

            if (previousRecipe) {
                setStatusMessage('Found in your library!');
                setConfirmedDish({ label: previousRecipe.dishLabel });
                setIngredients(previousRecipe.ingredients);
                setTextDescription(query); // Fix validation sync
                if (previousRecipe.questions) {
                    setAnalysisQuestions(previousRecipe.questions);
                }
                setTimeout(() => {
                    setLoggingState('review_ready');
                    setStatusMessage('');
                }, 800);
                return;
            }

            // 2. Fallback to AI Analysis
            setStatusMessage('Asking AI for ingredients...');
            const analysis = await analyzeFoodText(query);

            setAnalysisResult(analysis);
            setConfirmedDish({ label: analysis.dishName });

            // Map Ingredients
            const suggestedIngs = ingredientService.resolveIngredients(analysis.suggestedIngredients);
            const initialIngredients: ConfirmedIngredient[] = suggestedIngs.map(ing => ({
                ingredientId: ing.ingredient_id,
                canonicalName: ing.canonical_name,
                confirmedStatus: 'suggested',
                source: 'inferred_dish_prior',
                confidence: 0.8
            }));

            setIngredients(initialIngredients);
            setTextDescription(mealNameQuery); // Sync with raw text field

            // Map Questions
            setAnalysisQuestions(analysis.potentialQuestions.map(q => ({
                questionId: q.id,
                text: q.text,
                answer: ''
            })));

            setLoggingState('review_ready');
            setStatusMessage('');
        } catch (error) {
            console.error('Text Analysis Error:', error);
            setLoggingState('failed');
            setStatusMessage('Failed to get suggestions');
            Alert.alert("Error", "Could not get ingredient suggestions. You can still add them manually.");
        }
    };

    const handleSave = async () => {
        if (!textDescription && !photoUri && !confirmedDish?.label) {
            Alert.alert('Required', 'Please add a photo or meal name.');
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

            // Save/Update Recipe in Library if dish name exists
            if (confirmedDish?.label) {
                await StorageService.saveRecipe(confirmedDish.label, ingredients, analysisQuestions);
            }

            await StorageService.addMealEvent(newMeal);
            await NotificationService.handleUserLoggedActivity('meal');

            // Trigger recommendation recompute in background
            RecommendationService.recomputeRecommendations('meal_logged')
                .catch(err => console.error("Failed to recompute recommendations:", err));

            // Navigate to logs tab to see the entry
            navigation.navigate('Main', { screen: 'Log' });

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
                        Choose a method to get started and we will help you log your meal with ingredients.
                    </Text>
                </View>

                {/* Unified Logging Section */}
                <View style={styles.loggingSectionContainer}>
                    <Image
                        source={require('../../assets/meal_placeholder_bg.png')}
                        style={styles.loggingSectionBg}
                    />
                    <View style={styles.loggingSectionOverlay} />

                    {entryMethod !== 'none' && (
                        <TouchableOpacity onPress={resetEntryMethod} style={styles.closeSectionButton}>
                            <X color={Colors.onPrimaryContrast} size={20} strokeWidth={3} />
                        </TouchableOpacity>
                    )}

                    <View style={styles.loggingSectionContent}>
                        {/* Method Selection (Initial State) */}
                        {entryMethod === 'none' && (
                            <View style={styles.methodSelectorInner}>
                                <TouchableOpacity
                                    style={[styles.methodCardRefined, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}
                                    onPress={() => handleMethodSelect('camera')}
                                >
                                    <View style={[styles.methodIconCircle, { backgroundColor: Colors.primary }]}>
                                        <Camera color={Colors.onPrimaryContrast} size={28} />
                                    </View>
                                    <Text style={styles.methodLabelRefined}>Camera</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.methodCardRefined, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}
                                    onPress={() => handleMethodSelect('library')}
                                >
                                    <View style={[styles.methodIconCircle, { backgroundColor: '#007AFF' }]}>
                                        <ImagePlus color={Colors.onPrimaryContrast} size={28} />
                                    </View>
                                    <Text style={styles.methodLabelRefined}>Gallery</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.methodCardRefined, { backgroundColor: 'rgba(175, 82, 222, 0.15)' }]}
                                    onPress={() => handleMethodSelect('text')}
                                >
                                    <View style={[styles.methodIconCircle, { backgroundColor: '#AF52DE' }]}>
                                        <Type color={Colors.onPrimaryContrast} size={28} />
                                    </View>
                                    <Text style={styles.methodLabelRefined}>Type Meal</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Text Entry Mode */}
                        {entryMethod === 'text' && (
                            <View style={styles.activeTextContainer}>
                                <Text style={[styles.activeTextLabel, { color: Colors.onPrimaryContrast }]}>Enter Meal Name</Text>
                                <View style={styles.activeInputWrapper}>
                                    <TextInput
                                        style={styles.activeTextInput}
                                        placeholder="Enter meal name..."
                                        placeholderTextColor="rgba(255,255,255,0.6)"
                                        value={mealNameQuery}
                                        onChangeText={setMealNameQuery}
                                        onSubmitEditing={() => handleTextAnalysis()}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.activeSuggestBtn, !mealNameQuery.trim() && { opacity: 0.5 }]}
                                        onPress={() => handleTextAnalysis()}
                                        disabled={!mealNameQuery.trim() || loggingState === 'analyzing'}
                                    >
                                        <Zap color={Colors.onPrimaryContrast} size={20} />
                                    </TouchableOpacity>
                                </View>

                                {/* Recipe Typeahead Suggestions */}
                                {filteredSuggestions.length > 0 && loggingState === 'idle' && (
                                    <View style={styles.suggestionContainer}>
                                        {filteredSuggestions.map((suggestion, idx) => (
                                            <TouchableOpacity 
                                                key={idx} 
                                                style={styles.suggestionItem}
                                                onPress={() => {
                                                    const selected = suggestion.dishLabel;
                                                    setMealNameQuery(selected);
                                                    setFilteredSuggestions([]);
                                                    Keyboard.dismiss();
                                                    // Pass name directly to avoid state race condition
                                                    handleTextAnalysis(selected);
                                                }}
                                            >
                                                <Zap color={Colors.primary} size={14} style={{ marginRight: 8 }} />
                                                <Text style={styles.suggestionText}>{suggestion.dishLabel}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {loggingState === 'analyzing' && (
                                    <View style={styles.analyzingPill}>
                                        <ActivityIndicator size="small" color={Colors.onPrimaryContrast} />
                                        <Text style={styles.analyzingPillText}>{statusMessage || 'Analyzing...'}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Photo Entry Mode */}
                        {entryMethod === 'photo' && (
                            <View style={styles.activePhotoContainer}>
                                {!photoUri ? (
                                    <TouchableOpacity style={styles.photoCaptureOverlay} onPress={() => pickImage(true)}>
                                        <Camera color={Colors.onPrimaryContrast} size={48} strokeWidth={1} />
                                        <Text style={styles.photoCaptureText}>Tap to Capture</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.photoResultContainer}>
                                        <Image source={{ uri: photoUri }} style={[styles.photoResultImg, loggingState === 'analyzing' && { opacity: 0.6 }]} />

                                        <View style={styles.pillToggleOverlay}>
                                            <View style={styles.pillToggleRefined}>
                                                <TouchableOpacity style={styles.pillIconSmall} onPress={() => pickImage(true)}>
                                                    <Camera color={Colors.onSurfaceVariant} size={18} />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.pillIconSmall} onPress={() => pickImage(false)}>
                                                    <ImagePlus color={Colors.onSurfaceVariant} size={18} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {loggingState === 'analyzing' && (
                                            <View style={styles.analyzingOverlayRefined}>
                                                <ActivityIndicator size="large" color={Colors.onPrimaryContrast} />
                                                <Text style={styles.analyzingTextLarge}>{statusMessage || 'Identifying...'}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Analysis Results / Dish Name */}
                {(loggingState === 'review_ready' || entryMethod === 'text' && confirmedDish) && confirmedDish && (
                    <View style={styles.reviewContext}>
                        <View style={styles.dishNameContainerRefined}>
                            <Text style={styles.dishLabelRefinedSmall}>Detected Meal</Text>
                            <TextInput
                                style={styles.dishNameInputRefined}
                                value={confirmedDish.label}
                                onChangeText={(newLabel) => setConfirmedDish({ ...confirmedDish, label: newLabel })}
                            />
                        </View>
                        {renderReviewSection()}
                    </View>
                )}

                {/* Emotional Driver */}
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
    loggingSectionContainer: {
        width: '100%',
        height: 240,
        borderRadius: Radii.xl,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 24,
        backgroundColor: Colors.surfaceLowest,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    loggingSectionBg: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    loggingSectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    loggingSectionContent: {
        ...StyleSheet.absoluteFillObject,
        padding: 20,
        justifyContent: 'center',
    },
    closeSectionButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        padding: 8,
    },
    methodSelectorInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    methodCardRefined: {
        flex: 1,
        height: 120,
        borderRadius: Radii.xl,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    methodIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    methodLabelRefined: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: Colors.onPrimaryContrast,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },

    activeTextContainer: {
        alignItems: 'center',
    },
    activeTextLabel: {
        color: Colors.onPrimaryContrast,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        opacity: 0.8,
    },
    suggestionContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: Radii.md,
        marginTop: 8,
        padding: 4,
        maxHeight: 200,
        ...Shadows.ambient,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    suggestionText: {
        color: Colors.onSurface,
        fontSize: 16,
        fontWeight: '600',
    },
    activeInputWrapper: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: Radii.lg,
        padding: 4,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    activeTextInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 18,
        color: Colors.onPrimaryContrast,
        fontWeight: '500',
    },
    activeSuggestBtn: {
        width: 48,
        height: 48,
        borderRadius: Radii.md,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 16,
        gap: 8,
    },
    analyzingPillText: {
        color: Colors.onPrimaryContrast,
        fontWeight: '600',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    activePhotoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoCaptureOverlay: {
        alignItems: 'center',
        gap: 12,
    },
    photoCaptureText: {
        color: Colors.onPrimaryContrast,
        fontSize: 16,
        fontWeight: '600',
    },
    photoResultContainer: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: Radii.xl,
        overflow: 'hidden',
    },
    photoResultImg: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },
    pillToggleOverlay: {
        position: 'absolute',
        bottom: 12,
        width: '100%',
        alignItems: 'center',
    },
    pillToggleRefined: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 3,
        borderRadius: 25,
        gap: 3,
    },
    pillIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzingOverlayRefined: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzingTextLarge: {
        color: Colors.onPrimaryContrast,
        fontWeight: 'bold',
        fontSize: 18,
        marginTop: 16,
    },

    reviewContext: {
        marginTop: 8,
        marginBottom: 24,
    },
    dishNameContainerRefined: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainer,
        paddingBottom: 8,
    },
    dishLabelRefinedSmall: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    dishNameInputRefined: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.onSurface,
        padding: 0,
    },

    manualEntryContainer: { marginBottom: 24 },
    inputLabel: { ...Typography.label, fontSize: 12, marginBottom: 8, color: Colors.onSurfaceVariant, letterSpacing: 1 },
    manualInputRow: { flexDirection: 'row', gap: 10 },
    manualTextInput: {
        flex: 1,
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radii.lg,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.onSurface,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    suggestButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radii.lg,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 6,
    },
    suggestButtonText: { color: Colors.onPrimaryContrast, fontWeight: 'bold', fontSize: 14 },
    manualAnalyzing: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, backgroundColor: Colors.primarySubtle, padding: 12, borderRadius: Radii.md },
    manualAnalyzingText: { color: Colors.primary, fontWeight: '600' },

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
