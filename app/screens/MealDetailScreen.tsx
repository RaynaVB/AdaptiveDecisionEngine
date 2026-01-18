import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MealSlot, MealTypeTag } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { Trash2 } from 'lucide-react-native';

type MealDetailScreenRouteProp = RouteProp<RootStackParamList, 'MealDetail'>;
type MealDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealDetail'>;

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BASE_LOAD_TAGS: MealTypeTag[] = ['light', 'regular', 'heavy'];
const OTHER_TAGS: MealTypeTag[] = [
    'sweet', 'savory', 'homemade', 'restaurant', 'packaged',
    'high_sugar', 'fried_greasy', 'high_protein', 'high_fiber', 'caffeinated'
];

export default function MealDetailScreen() {
    const navigation = useNavigation<MealDetailScreenNavigationProp>();
    const route = useRoute<MealDetailScreenRouteProp>();
    const { mealId } = route.params;

    const [meal, setMeal] = useState<MealEvent | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [textDescription, setTextDescription] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<MealSlot>('lunch');
    const [selectedTags, setSelectedTags] = useState<MealTypeTag[]>([]);

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
            setSelectedTags(found.mealTypeTags);
        } else {
            Alert.alert('Error', 'Meal not found');
            navigation.goBack();
        }
        setLoading(false);
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

    const handleSave = async () => {
        if (!meal) return;

        const updatedMeal: MealEvent = {
            ...meal,
            mealSlot: selectedSlot,
            textDescription: textDescription || undefined,
            mealTypeTags: selectedTags.length > 0 ? selectedTags : ['unknown'],
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

                <View style={styles.section}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={styles.textInput}
                        value={textDescription}
                        onChangeText={setTextDescription}
                        placeholder="Description..."
                    />
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
                    <View style={styles.tagsRow}>
                        {[...BASE_LOAD_TAGS, ...OTHER_TAGS].map(tag => (
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

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Trash2 color="#ef4444" size={20} />
                    <Text style={styles.deleteText}>Delete Entry</Text>
                </TouchableOpacity>

            </ScrollView>

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
});
