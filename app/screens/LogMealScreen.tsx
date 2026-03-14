import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { Camera, X } from 'lucide-react-native';

import { RootStackParamList } from '../../src/models/navigation';
import { MealSlot, MealTypeTag, MealEvent, MealReason } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { NotificationService } from '../../src/services/NotificationService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { analyzeFoodImage, uploadImageToFirebase } from '../../src/services/visionService';
import { auth } from '../../src/services/firebaseConfig';

type LogMealScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LogMeal'>;

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BASE_LOAD_TAGS: MealTypeTag[] = ['light', 'regular', 'heavy'];
const OTHER_TAGS: MealTypeTag[] = [
    'sweet', 'savory', 'homemade', 'restaurant', 'packaged',
    'high_sugar', 'fried_greasy', 'high_protein', 'high_fiber', 'caffeinated'
];

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
    const [selectedSlot, setSelectedSlot] = useState<MealSlot>(determineMealSlot(new Date())); // Dynamically estimate based on current time
    const [selectedReason, setSelectedReason] = useState<MealReason | undefined>(undefined);
    const [selectedTags, setSelectedTags] = useState<MealTypeTag[]>([]);

    const [occurredAt, setOccurredAt] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

                if (selectedAsset.base64) {
                    setIsAnalyzingImage(true);
                    try {
                        // Assuming JPEG format from Expo ImagePicker
                        const analysis = await analyzeFoodImage(selectedAsset.base64, 'image/jpeg');
                        
                        if (analysis.description) {
                            setTextDescription(prev => prev ? `${prev}\n${analysis.description}` : analysis.description);
                        }
                        
                        if (analysis.tags && analysis.tags.length > 0) {
                            setSelectedTags(prevTags => {
                                const newTags = new Set([...prevTags, ...analysis.tags]);
                                return Array.from(newTags);
                            });
                        }
                    } catch (error) {
                        console.error('Vision API Error:', error);
                        // Fails smoothly, user can still manually enter details
                        // Alert.alert('Notice', 'Could not auto-analyze image, please enter details manually.');
                    } finally {
                        setIsAnalyzingImage(false);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const toggleTag = (tag: MealTypeTag) => {
        setSelectedTags(prev => {
            if (prev.includes(tag)) {
                return prev.filter(t => t !== tag);
            } else {
                return [...prev, tag];
            }
        });
    };

    const applyPreset = (preset: 'Quick Snack Sweet' | 'Heavy Dinner Out' | 'Light Breakfast') => {
        const d = new Date();
        if (preset === 'Quick Snack Sweet') {
            setSelectedSlot('snack');
            setSelectedTags(['regular', 'sweet', 'packaged']);
            d.setHours(16, 0, 0, 0); // 4 PM
            setOccurredAt(d);
        } else if (preset === 'Heavy Dinner Out') {
            setSelectedSlot('dinner');
            setSelectedTags(['heavy', 'savory', 'restaurant']);
            d.setHours(19, 0, 0, 0); // 7 PM
            setOccurredAt(d);
        } else if (preset === 'Light Breakfast') {
            setSelectedSlot('breakfast');
            setSelectedTags(['light', 'homemade']);
            d.setHours(8, 0, 0, 0); // 8 AM
            setOccurredAt(d);
        }
    };

    const handleSave = async () => {
        if (!textDescription && !photoUri) {
            Alert.alert('Required', 'Please add a photo or text description.');
            return;
        }

        setIsSaving(true);
        const tagsToSave = selectedTags.length > 0 ? selectedTags : ['unknown'];
        const mealId = uuidv4();

        const newMeal: MealEvent = {
            id: mealId,
            createdAt: new Date().toISOString(),
            occurredAt: occurredAt.toISOString(),
            mealSlot: selectedSlot,
            inputMode: photoUri ? 'photo' : 'text',
            mealReason: selectedReason,
            mealTypeTags: tagsToSave as MealTypeTag[],
            tags: tagsToSave, // The ML-expected array
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
                            <Image source={{ uri: photoUri }} style={[styles.photoPreview, isAnalyzingImage && { opacity: 0.5 }]} />
                            <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(undefined)}>
                                <X color="#fff" size={16} />
                            </TouchableOpacity>
                            {isAnalyzingImage && (
                                <View style={styles.analyzingOverlay}>
                                    <Text style={styles.analyzingText}>Analyzing...</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <TextInput
                        style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }, isAnalyzingImage && { backgroundColor: '#f9fafb' }]}
                        placeholder={isAnalyzingImage ? "AI is describing your food..." : "What did you eat?"}
                        value={textDescription}
                        onChangeText={setTextDescription}
                        multiline={true}
                        editable={!isAnalyzingImage}
                    />
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

                {/* Quick Presets */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Presets</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                        <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('Quick Snack Sweet')}>
                            <Text style={styles.presetText}>Quick Snack Sweet</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('Heavy Dinner Out')}>
                            <Text style={styles.presetText}>Heavy Dinner Out</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.presetChip} onPress={() => applyPreset('Light Breakfast')}>
                            <Text style={styles.presetText}>Light Breakfast</Text>
                        </TouchableOpacity>
                    </ScrollView>
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

                {/* Tags */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tags</Text>
                    <Text style={[styles.subTitle, { marginBottom: 12, fontStyle: 'italic', fontSize: 13 }]}>
                        Pick 1–3 tags (optional). If unsure, leave blank.
                    </Text>
                    <Text style={styles.subTitle}>Base Load</Text>
                    <View style={styles.tagsRow}>
                        {BASE_LOAD_TAGS.map(tag => (
                            <TouchableOpacity
                                key={tag}
                                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipSelected]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                                    {tag}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.subTitle, { marginTop: 12 }]}>Details</Text>
                    <View style={styles.tagsRow}>
                        {OTHER_TAGS.map(tag => (
                            <TouchableOpacity
                                key={tag}
                                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipSelected]}
                                onPress={() => toggleTag(tag)}
                            >
                                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextSelected]}>
                                    {tag.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving || isAnalyzingImage}>
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
    photoPreviewContainer: { marginBottom: 12, position: 'relative', alignSelf: 'flex-start' },
    photoPreview: { width: 100, height: 100, borderRadius: 8 },
    analyzingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 8,
    },
    analyzingText: { color: '#1e3a8a', fontWeight: 'bold', fontSize: 12 },
    removePhoto: {
        position: 'absolute', top: -6, right: -6, backgroundColor: '#ef4444',
        borderRadius: 12, padding: 4
    },

    presetRow: { flexDirection: 'row' },
    presetChip: {
        backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb'
    },
    presetText: { fontSize: 13, color: '#374151' },

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
});
