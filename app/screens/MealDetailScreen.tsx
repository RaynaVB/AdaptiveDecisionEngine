import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image, LayoutAnimation } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MealEvent, MealSlot, MealTypeTag, MealReason } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { Trash2 } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

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
    const [selectedReason, setSelectedReason] = useState<MealReason | undefined>(undefined);
    const [selectedTags, setSelectedTags] = useState<MealTypeTag[]>([]);

    const [occurredAt, setOccurredAt] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

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
            setSelectedTags(found.mealTypeTags);
            setOccurredAt(new Date(found.occurredAt));
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
            occurredAt: occurredAt.toISOString(),
            mealSlot: selectedSlot,
            textDescription: textDescription || undefined,
            mealReason: selectedReason,
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
});
