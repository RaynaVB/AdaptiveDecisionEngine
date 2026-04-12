import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, LayoutAnimation, TextInput, Modal, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { SymptomEvent, BehavioralValue, SymptomCategory } from '../../src/models/Symptom';
import { StorageService } from '../../src/services/storage';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { NotificationService } from '../../src/services/NotificationService';
import { Clock, Check } from 'lucide-react-native';
import { RecommendationService } from '../../src/services/recommendationService';
import { PatternAlertService } from '../../src/services/patternAlertService';
import { Colors, Shadows, Radii } from '../constants/Theme';

type MoodLoggerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MoodLogger'>;

interface MoodEntry {
    name: string;
    category: SymptomCategory;
    severity: number;
    durationMinutes: number | null;
    minLabel: string;
    maxLabel: string;
}

const DEFAULT_MOODS: MoodEntry[] = [
    { name: 'Mood', category: 'mood', severity: 0, durationMinutes: null, minLabel: 'Sad', maxLabel: 'Happy' },
    { name: 'Stress', category: 'mood', severity: 0, durationMinutes: null, minLabel: 'Relaxed', maxLabel: 'Stressed' },
    { name: 'Social', category: 'mood', severity: 0, durationMinutes: null, minLabel: 'Withdrawn', maxLabel: 'Connected' },
    { name: 'Energy', category: 'energy', severity: 0, durationMinutes: null, minLabel: 'Tired', maxLabel: 'Wired' },
    { name: 'Focus', category: 'neurological', severity: 0, durationMinutes: null, minLabel: 'Foggy', maxLabel: 'Sharp' },
    { name: 'Sleep Quality', category: 'sleep', severity: 0, durationMinutes: null, minLabel: 'Poor', maxLabel: 'Great' }
];

const DURATION_PRESETS = [
    { label: '5m', value: 5 },
    { label: '10m', value: 10 },
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h+', value: 120 },
];

export default function MoodLoggerScreen() {
    const navigation = useNavigation<MoodLoggerScreenNavigationProp>();

    const [occurredAt, setOccurredAt] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [entries, setEntries] = useState<MoodEntry[]>([...DEFAULT_MOODS.map(m => ({ ...m }))]);
    const [customMood, setCustomMood] = useState('');

    const [activeDurationIndex, setActiveDurationIndex] = useState<number | null>(null);

    const toggleDatePicker = (show: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDatePicker(show);
    };

    const toggleTimePicker = (show: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowTimePicker(show);
    };

    const updateSeverity = (index: number, val: number) => {
        const newEntries = [...entries];
        newEntries[index].severity = val;
        setEntries(newEntries);
    };

    const getSeverityColor = (severity: number) => {
        const sev = Math.round(severity);
        if (sev === 2) return Colors.success;
        if (sev === 1) return 'rgba(5, 150, 105, 0.4)';
        if (sev === -1) return 'rgba(220, 38, 38, 0.4)';
        if (sev === -2) return Colors.error;
        return Colors.outline; // Neutral/0
    };

    const handleSave = async () => {
        const activeEntries = [...entries];

        if (customMood.trim() !== '') {
            activeEntries.push({
                name: customMood.trim(),
                category: 'mood',
                severity: 0,
                durationMinutes: null,
                minLabel: 'Low',
                maxLabel: 'High'
            });
        }

        for (const entry of activeEntries) {
            const ev: SymptomEvent = {
                id: uuidv4(),
                symptomType: entry.name.toLowerCase(),
                category: entry.category,
                severity: Math.round(entry.severity) as BehavioralValue,
                occurredAt: occurredAt.toISOString(),
                isOngoing: false,
                source: 'manual',
                createdAt: new Date().toISOString()
            };
            if (entry.durationMinutes !== null) {
                ev.durationMinutes = entry.durationMinutes;
            }

            await StorageService.addMoodEvent(ev);
        }

        await NotificationService.handleUserLoggedActivity('mood');
        
        RecommendationService.recomputeRecommendations('mood_logged')
            .catch(err => console.error("Failed to recompute recommendations:", err));

        PatternAlertService.scanForAlerts()
            .catch(err => console.warn('[PatternAlerts] scan failed:', err));

        navigation.navigate('Main', { screen: 'Log' });
    };

    const formatDuration = (mins: number | null) => {
        if (!mins) return null;
        if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
        return `${mins}m`;
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.dateTimeRow}>
                    <TouchableOpacity style={styles.dateTimeButton} onPress={() => toggleDatePicker(!showDatePicker)}>
                        <Clock size={16} color={Colors.outline} style={{ marginRight: 6 }} />
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
                            onChange={(e, d) => { if (Platform.OS !== 'ios') toggleDatePicker(false); if (d) { const n = new Date(d); n.setHours(occurredAt.getHours(), occurredAt.getMinutes()); setOccurredAt(n); } }}
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
                            onChange={(e, d) => { if (Platform.OS !== 'ios') toggleTimePicker(false); if (d) { const n = new Date(occurredAt); n.setHours(d.getHours(), d.getMinutes()); setOccurredAt(n); } }}
                        />
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity style={styles.iosPickerDoneButton} onPress={() => toggleTimePicker(false)}>
                                <Text style={styles.iosPickerDoneText}>Done</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.listContainer}>
                    {entries.map((entry, index) => (
                        <View key={entry.name}>
                            <View style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <Text style={styles.rowName}>{entry.name}</Text>
                                </View>

                                <View style={styles.rowRight}>
                                    <Text style={styles.labelIndicator}>{entry.minLabel}</Text>
                                    <View style={styles.sliderWrapper}>
                                        <Slider
                                            style={styles.slider}
                                            minimumValue={-2}
                                            maximumValue={2}
                                            step={1}
                                            value={entry.severity}
                                            onValueChange={(val) => updateSeverity(index, val)}
                                            minimumTrackTintColor={entry.severity > 0 ? getSeverityColor(entry.severity) : Colors.surfaceContainerHighest}
                                            maximumTrackTintColor={entry.severity < 0 ? getSeverityColor(entry.severity) : Colors.surfaceContainerHighest}
                                            thumbTintColor={entry.severity !== 0 ? getSeverityColor(entry.severity) : Colors.outline}
                                        />
                                    </View>
                                    <Text style={styles.labelIndicator}>{entry.maxLabel}</Text>

                                    <TouchableOpacity
                                        style={styles.durationBadge}
                                        onPress={() => setActiveDurationIndex(index)}
                                    >
                                        <Clock size={16} color={entry.durationMinutes ? Colors.primary : Colors.outline} />
                                        {entry.durationMinutes && (
                                            <Text style={styles.durationText}>{formatDuration(entry.durationMinutes)}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}

                    <View style={styles.customRow}>
                        <TextInput
                            style={styles.customInput}
                            placeholder="Add custom mood..."
                            placeholderTextColor={Colors.outline}
                            value={customMood}
                            onChangeText={setCustomMood}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.stickyFooter}>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                >
                    <View style={styles.saveButtonContent}>
                        <Check color={Colors.onPrimaryContrast} size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.saveButtonText}>CONFIRM MOOD</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <Modal
                transparent={true}
                visible={activeDurationIndex !== null}
                animationType="fade"
                onRequestClose={() => setActiveDurationIndex(null)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveDurationIndex(null)}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Set Duration</Text>
                        <View style={styles.presetTagsRow}>
                            {DURATION_PRESETS.map(preset => {
                                const isSelected = activeDurationIndex !== null && entries[activeDurationIndex]?.durationMinutes === preset.value;
                                return (
                                    <TouchableOpacity
                                        key={preset.label}
                                        style={[styles.presetTag, isSelected && styles.presetTagSelected]}
                                        onPress={() => {
                                            if (activeDurationIndex !== null) {
                                                const newEntries = [...entries];
                                                newEntries[activeDurationIndex].durationMinutes = isSelected ? null : preset.value;
                                                setEntries(newEntries);
                                                setActiveDurationIndex(null);
                                            }
                                        }}
                                    >
                                        <Text style={[styles.presetTagText, isSelected && styles.presetTagTextSelected]}>{preset.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.modalClearButton} onPress={() => {
                            if (activeDurationIndex !== null) {
                                const newEntries = [...entries];
                                newEntries[activeDurationIndex].durationMinutes = null;
                                setEntries(newEntries);
                                setActiveDurationIndex(null);
                            }
                        }}>
                            <Text style={styles.modalClearText}>Clear Duration</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    contentContainer: { paddingBottom: 40 },
    dateTimeRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surfaceLowest,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    dateTimeButton: { flexDirection: 'row', alignItems: 'center' },
    dateTimeText: { color: Colors.onSurfaceVariant, fontSize: 16, fontWeight: '500' },
    iosPickerContainer: { backgroundColor: Colors.surfaceContainerLow, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHighest },
    iosPickerDoneButton: { padding: 12, alignItems: 'center', backgroundColor: Colors.surfaceContainerHighest },
    iosPickerDoneText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
    listContainer: {
        marginTop: 8,
        backgroundColor: Colors.surfaceLowest,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainerLow,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainerLow,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainerLow
    },
    rowLeft: {
        width: '25%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    rowName: {
        fontSize: 15,
        color: Colors.onSurface,
        fontWeight: '500'
    },
    rowRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    sliderWrapper: {
        flex: 1,
        marginHorizontal: 8,
    },
    slider: {
        width: '100%',
        height: 40
    },
    labelIndicator: {
        fontSize: 11,
        color: Colors.outline,
        width: 60,
        textAlign: 'center'
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 4,
        gap: 4
    },
    durationText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600'
    },
    customRow: {
        marginTop: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: Colors.surfaceLowest,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainerLow
    },
    customInput: {
        fontSize: 15,
        color: Colors.onSurfaceVariant,
        fontStyle: 'italic'
    },
    stickyFooter: {
        padding: 16,
        backgroundColor: Colors.surfaceLowest,
        borderTopWidth: 1,
        borderTopColor: Colors.surfaceContainerLow,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: Radii.lg,
        paddingVertical: 14,
        alignItems: 'center',
        ...Shadows.ambient,
    },
    saveButtonText: {
        color: Colors.onPrimaryContrast,
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.scrim,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContent: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        ...Shadows.ambient,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.onSurface,
        marginBottom: 20
    },
    presetTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24
    },
    presetTag: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.surfaceContainerHighest
    },
    presetTagSelected: {
        backgroundColor: Colors.primarySubtle,
        borderColor: Colors.primary
    },
    presetTagText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.onSurfaceVariant
    },
    presetTagTextSelected: {
        color: Colors.primary
    },
    modalClearButton: {
        paddingVertical: 10
    },
    modalClearText: {
        color: Colors.error,
        fontSize: 15,
        fontWeight: '600'
    }
});
