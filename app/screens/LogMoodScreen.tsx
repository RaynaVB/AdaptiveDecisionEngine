import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, LayoutAnimation, KeyboardAvoidingView, SafeAreaView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MoodValence, MoodEnergy, MoodStress, MoodTag, MoodEvent } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { NotificationService } from '../../src/services/NotificationService';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { RecommendationService } from '../../src/services/recommendationService';
import { Colors, Typography, Radii, Shadows, Spacing } from '../constants/Theme';

type LogMoodScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LogMood'>;

const MOOD_TAGS: MoodTag[] = ['anxious', 'bored', 'sad', 'angry', 'lonely', 'celebratory'];

export default function LogMoodScreen() {
    const navigation = useNavigation<LogMoodScreenNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'LogMood'>>();

    const suggestedTimestamp = route.params?.timestamp;
    const { mealId } = route.params || {};

    // ML Model Stats (Floats: -1.0 to 1.0)
    const [valence, setValence] = useState<number>(0.0);
    const [energy, setEnergy] = useState<number>(0.0);
    const [stress, setStress] = useState<MoodStress>('medium');
    const [selectedTag, setSelectedTag] = useState<MoodTag | undefined>();

    const [occurredAt, setOccurredAt] = useState<Date>(suggestedTimestamp ? new Date(suggestedTimestamp) : new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const handleValenceChange = (val: number) => {
        // Snap to zero if within a small threshold to make "Neutral" easier to hit
        if (Math.abs(val) < 0.15) {
            setValence(0.0);
        } else {
            setValence(val);
        }
    };

    const handleEnergyChange = (val: number) => {
        // Snap to zero if within a small threshold to make "Neutral" easier to hit
        if (Math.abs(val) < 0.15) {
            setEnergy(0.0);
        } else {
            setEnergy(val);
        }
    };

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
            setOccurredAt(prevDate => {
                const newDate = new Date(selectedDate);
                newDate.setHours(prevDate.getHours(), prevDate.getMinutes(), prevDate.getSeconds(), prevDate.getMilliseconds());
                return newDate;
            });
        }
    };

    const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS !== 'ios') {
            toggleTimePicker(false);
        }
        if (selectedDate) {
            setOccurredAt(prevDate => {
                const newDate = new Date(prevDate);
                newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), selectedDate.getSeconds(), selectedDate.getMilliseconds());
                return newDate;
            });
        }
    };

    const deriveMoodLabel = (v: number, a: number) => {
        if (v > 0.3 && a > 0.3) return 'Excited';
        if (v > 0.3 && a < -0.3) return 'Relaxed';
        if (v < -0.3 && a > 0.3) return 'Anxious';
        if (v < -0.3 && a < -0.3) return 'Exhausted';
        if (v < -0.3 && a >= -0.3 && a <= 0.3) return 'Sad';
        if (v > 0.3 && a >= -0.3 && a <= 0.3) return 'Happy';
        return 'Neutral';
    };

    const handleSave = async () => {
        const newMood: MoodEvent = {
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            occurredAt: occurredAt.toISOString(),
            valence: parseFloat(valence.toFixed(2)),
            arousal: parseFloat(energy.toFixed(2)),
            moodLabel: deriveMoodLabel(valence, energy),
            stress: stress,
        };

        if (selectedTag) newMood.tag = selectedTag;
        if (mealId) newMood.linkedMealEventId = mealId;

        await StorageService.addMoodEvent(newMood);
        await NotificationService.handleUserLoggedActivity('mood');
        
        // Trigger recommendation recompute in background
        RecommendationService.recomputeRecommendations('mood_logged')
            .catch(err => console.error("Failed to recompute recommendations:", err));

        navigation.popToTop(); // Go back to Timeline
    };

    const renderStressOptions = () => (
        <View style={styles.segmentContainer}>
            <Text style={styles.segmentLabel}>Stress Level</Text>
            <View style={styles.segmentRow}>
                {(['low', 'medium', 'high'] as MoodStress[]).map(opt => (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.segmentBtn, stress === opt && styles.segmentBtnSelected]}
                        onPress={() => setStress(opt)}
                    >
                        <Text style={[styles.segmentBtnText, stress === opt && styles.segmentBtnTextSelected]}>
                            {opt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Mood Date & Time */}
                <View style={[styles.section, { marginTop: 0, marginBottom: 24 }]}>
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

                <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Pleasantness (Valence)</Text>
                    <Text style={styles.sliderSubtext}>{valence > 0 ? 'Positive / Pleasant' : valence < 0 ? 'Negative / Unpleasant' : 'Neutral'}</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={-1.0}
                        maximumValue={1.0}
                        step={0.1}
                        value={valence}
                        onValueChange={handleValenceChange}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.surfaceContainerLow}
                    />
                    <View style={styles.sliderTicks}>
                        <Text style={styles.tickText}>Negative</Text>
                        <Text style={styles.tickText}>Positive</Text>
                    </View>
                </View>

                <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Energy (Arousal)</Text>
                    <Text style={styles.sliderSubtext}>{energy > 0 ? 'High Energy / Activated' : energy < 0 ? 'Low Energy / Calm' : 'Neutral'}</Text>
                    <Slider
                        style={styles.slider}
                        minimumValue={-1.0}
                        maximumValue={1.0}
                        step={0.1}
                        value={energy}
                        onValueChange={handleEnergyChange}
                        minimumTrackTintColor={Colors.primary}
                        maximumTrackTintColor={Colors.surfaceContainerLow}
                    />
                    <View style={styles.sliderTicks}>
                        <Text style={styles.tickText}>Low</Text>
                        <Text style={styles.tickText}>High</Text>
                    </View>
                </View>

                <View style={styles.derivedBox}>
                    <Text style={styles.derivedLabel}>Current state:</Text>
                    <Text style={styles.derivedValue}>{deriveMoodLabel(valence, energy)}</Text>
                </View>

                {renderStressOptions()}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Optional Tag (Select one)</Text>
                    <View style={styles.tagsRow}>
                        {MOOD_TAGS.map(tag => (
                            <TouchableOpacity
                                key={tag}
                                style={[styles.tagChip, selectedTag === tag && styles.tagChipSelected]}
                                onPress={() => setSelectedTag(selectedTag === tag ? undefined : tag)}
                            >
                                <Text style={[styles.tagText, selectedTag === tag && styles.tagTextSelected]}>
                                    {tag}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity style={[styles.saveButton, { marginTop: 16 }]} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Finish</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    contentContainer: { padding: 20, flexGrow: 1, paddingBottom: 40, justifyContent: 'space-between' },

    sliderContainer: { marginBottom: 16 },
    sliderLabel: { ...Typography.title, fontSize: 16, color: Colors.onSurface, marginBottom: 2 },
    sliderSubtext: { ...Typography.body, fontSize: 14, color: Colors.onSurfaceVariant, marginBottom: 8 },
    slider: { width: '100%', height: 40 },
    sliderTicks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
    tickText: { ...Typography.label, fontSize: 12, color: Colors.outline },

    derivedBox: { backgroundColor: Colors.surfaceContainerLow, padding: 12, borderRadius: Radii.lg, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.surfaceContainer },
    derivedLabel: { ...Typography.label, fontSize: 12, color: Colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 2 },
    derivedValue: { ...Typography.title, fontSize: 20, color: Colors.primary },

    segmentContainer: { marginBottom: 16 },
    segmentLabel: { ...Typography.label, fontSize: 14, color: Colors.onSurface, marginBottom: 8, textTransform: 'uppercase' },
    segmentRow: { flexDirection: 'row', backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.md, padding: 4 },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    segmentBtnSelected: { backgroundColor: Colors.background, ...Shadows.ambient },
    segmentBtnText: { ...Typography.body, color: Colors.onSurfaceVariant, textTransform: 'capitalize' },
    segmentBtnTextSelected: { color: Colors.onSurface, fontWeight: '700' },

    section: { marginTop: 8 },
    sectionTitle: { ...Typography.title, fontSize: 16, marginBottom: 8, color: Colors.onSurface },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    tagChip: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
        backgroundColor: Colors.surfaceContainerLow, marginRight: 8, marginBottom: 8,
        borderWidth: 1, borderColor: 'transparent'
    },
    tagChipSelected: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
    tagText: { ...Typography.body, fontSize: 14, color: Colors.onSurface, textTransform: 'capitalize' },
    tagTextSelected: { color: Colors.primary, fontWeight: '700' },

    dateTimeButton: {
        flex: 1,
        backgroundColor: Colors.surfaceContainerLow,
        paddingVertical: 12,
        borderRadius: Radii.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.surfaceContainer
    },
    dateTimeText: { ...Typography.body, color: Colors.onSurface, fontSize: 16, fontWeight: '500' },
    iosPickerContainer: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radii.lg, marginTop: 8, overflow: 'hidden' },
    iosPickerDoneButton: { padding: 12, alignItems: 'center', backgroundColor: Colors.surfaceContainer, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    iosPickerDoneText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },

    saveButton: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 16, alignItems: 'center' },
    saveButtonText: { color: Colors.onPrimaryContrast, fontSize: 16, fontWeight: '700' },
});
