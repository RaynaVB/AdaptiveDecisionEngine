import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { Camera, X } from 'lucide-react-native';

import { RootStackParamList } from '../../src/models/navigation';
import { MealSlot, MealTypeTag, MealEvent } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { NotificationService } from '../../src/services/NotificationService';

type LogMealScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LogMeal'>;

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BASE_LOAD_TAGS: MealTypeTag[] = ['light', 'regular', 'heavy'];
const OTHER_TAGS: MealTypeTag[] = [
    'sweet', 'savory', 'homemade', 'restaurant', 'packaged',
    'high_sugar', 'fried_greasy', 'high_protein', 'high_fiber', 'caffeinated'
];

export default function LogMealScreen() {
    const navigation = useNavigation<LogMealScreenNavigationProp>();

    const [textDescription, setTextDescription] = useState('');
    const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
    const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch'); // Default? Or empty?
    const [selectedTags, setSelectedTags] = useState<MealTypeTag[]>([]);

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
                    quality: 0.7,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: 'images',
                    quality: 0.7,
                });
            }

            if (!result.canceled) {
                setPhotoUri(result.assets[0].uri);
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
        if (preset === 'Quick Snack Sweet') {
            setSelectedSlot('snack');
            setSelectedTags(['regular', 'sweet', 'packaged']);
        } else if (preset === 'Heavy Dinner Out') {
            setSelectedSlot('dinner');
            setSelectedTags(['heavy', 'savory', 'restaurant']);
        } else if (preset === 'Light Breakfast') {
            setSelectedSlot('breakfast');
            setSelectedTags(['light', 'homemade']);
        }
    };

    const handleSave = async () => {
        if (!textDescription && !photoUri) {
            Alert.alert('Required', 'Please add a photo or text description.');
            return;
        }

        const tagsToSave = selectedTags.length > 0 ? selectedTags : ['unknown'];

        const newMeal: MealEvent = {
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            occurredAt: new Date().toISOString(),
            mealSlot: selectedSlot,
            inputMode: photoUri ? 'photo' : 'text',
            mealTypeTags: tagsToSave as MealTypeTag[],
            textDescription: textDescription || undefined,
            photoUri: photoUri,
        };

        await StorageService.addMealEvent(newMeal);
        await NotificationService.handleUserLoggedActivity('meal');

        Alert.alert(
            'Meal Saved',
            'Log mood now?',
            [
                {
                    text: 'Not Now',
                    style: 'cancel',
                    onPress: () => navigation.navigate('Timeline')
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
            <ScrollView contentContainerStyle={styles.scrollContent}>

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
                            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                            <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(undefined)}>
                                <X color="#fff" size={16} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <TextInput
                        style={styles.textInput}
                        placeholder="What did you eat?"
                        value={textDescription}
                        onChangeText={setTextDescription}
                    />
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

                {/* Meal Slot */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Meal Slot</Text>
                    <View style={styles.slotRow}>
                        {MEAL_SLOTS.map(slot => (
                            <TouchableOpacity
                                key={slot}
                                style={[styles.slotChip, selectedSlot === slot && styles.slotChipSelected]}
                                onPress={() => setSelectedSlot(slot)}
                            >
                                <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextSelected]}>
                                    {slot}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
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
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Meal</Text>
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

    slotRow: { flexDirection: 'row', justifyContent: 'space-between' },
    slotChip: {
        flex: 1, alignItems: 'center', paddingVertical: 10,
        borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginHorizontal: 4
    },
    slotChipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    slotText: { textTransform: 'capitalize', color: '#374151' },
    slotTextSelected: { color: '#fff', fontWeight: '600' },

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
