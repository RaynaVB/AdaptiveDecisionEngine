import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, LayoutAnimation, TextInput, Modal, KeyboardAvoidingView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { SymptomEvent, SymptomSeverity, SymptomCategory } from '../../src/models/Symptom';
import { StorageService } from '../../src/services/storage';
import { v4 as uuidv4 } from 'uuid';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { NotificationService } from '../../src/services/NotificationService';
import { Clock } from 'lucide-react-native';
import { RecommendationService } from '../../src/services/recommendationService';
import { Colors, Shadows, Radii } from '../constants/Theme';

type SymptomLoggerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SymptomLogger'>;
type SymptomLoggerScreenRouteProp = RouteProp<RootStackParamList, 'SymptomLogger'>;

interface SymptomEntry {
    name: string;
    category: SymptomCategory;
    severity: number;
    durationMinutes: number | null;
}

const DEFAULT_SYMPTOMS: SymptomEntry[] = [
    { name: 'Nausea', category: 'digestive', severity: 0, durationMinutes: null },
    { name: 'Stomach Pain', category: 'digestive', severity: 0, durationMinutes: null },
    { name: 'Diarrhea', category: 'digestive', severity: 0, durationMinutes: null },
    { name: 'Constipation', category: 'digestive', severity: 0, durationMinutes: null },
    { name: 'Bloating', category: 'digestive', severity: 0, durationMinutes: null },
    { name: 'Reflux', category: 'digestive', severity: 0, durationMinutes: null },
    { name: 'Headache', category: 'neurological', severity: 0, durationMinutes: null },
    { name: 'Dizziness', category: 'neurological', severity: 0, durationMinutes: null },
    { name: 'Brain Fog', category: 'neurological', severity: 0, durationMinutes: null },
    { name: 'Fatigue', category: 'energy', severity: 0, durationMinutes: null },
    { name: 'Congestion', category: 'respiratory', severity: 0, durationMinutes: null },
    { name: 'Skin Irritation', category: 'skin', severity: 0, durationMinutes: null }
];

const DEFAULT_MOODS: SymptomEntry[] = [
    { name: 'Anxiety', category: 'mood', severity: 0, durationMinutes: null },
    { name: 'Irritability', category: 'mood', severity: 0, durationMinutes: null },
    { name: 'Low Mood', category: 'mood', severity: 0, durationMinutes: null },
    { name: 'Low Energy', category: 'energy', severity: 0, durationMinutes: null },
    { name: 'Poor Sleep', category: 'sleep', severity: 0, durationMinutes: null }
];

const DURATION_PRESETS = [
    { label: '5m', value: 5 },
    { label: '10m', value: 10 },
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h+', value: 120 },
];

export default function SymptomLoggerScreen() {
    const navigation = useNavigation<SymptomLoggerScreenNavigationProp>();
    const route = useRoute<SymptomLoggerScreenRouteProp>();
    const mode = route.params?.mode || 'symptom';

    React.useEffect(() => {
        navigation.setOptions({
            headerTitle: mode === 'mood' ? 'Log Mood' : 'Log Symptoms'
        });
    }, [navigation, mode]);

    const [occurredAt, setOccurredAt] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    
    const [entries, setEntries] = useState<SymptomEntry[]>(mode === 'mood' ? [...DEFAULT_MOODS.map(m => ({...m}))] : [...DEFAULT_SYMPTOMS.map(s => ({...s}))]);
    const [customSymptom, setCustomSymptom] = useState('');
    
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

    const getSeverityColor = (sev: number) => {
        switch (Math.round(sev)) {
            case 1: return Colors.warning;
            case 2: return Colors.warning;
            case 3: return Colors.warning;
            case 4: return Colors.error;
            case 5: return Colors.error;
            default: return Colors.divider;
        }
    };

    const handleSave = async () => {
        const activeEntries = entries.filter(e => e.severity > 0);
        
        let customEntryObj = null;
        if (customSymptom.trim() !== '') {
            customEntryObj = {
                name: customSymptom.trim(),
                category: mode === 'mood' ? 'mood' as SymptomCategory : 'custom' as SymptomCategory,
                severity: 3, // default severity for custom entry if not slided
                durationMinutes: null
            };
            activeEntries.push(customEntryObj);
        }

        if (activeEntries.length === 0) {
            navigation.goBack();
            return;
        }

        const eventsToSave: SymptomEvent[] = activeEntries.map(e => {
            const ev: Partial<SymptomEvent> = {
                id: uuidv4(),
                symptomType: e.name.toLowerCase(),
                category: e.category,
                severity: Math.round(e.severity) as SymptomSeverity,
                occurredAt: occurredAt.toISOString(),
                isOngoing: false,
                source: 'manual' as const,
                createdAt: new Date().toISOString()
            };
            if (e.durationMinutes !== null) {
                ev.durationMinutes = e.durationMinutes;
            }
            return ev as SymptomEvent;
        });

        for (const ev of eventsToSave) {
            await StorageService.addSymptomEvent(ev);
        }

        await NotificationService.handleUserLoggedActivity('mood');
        
        // Trigger recommendation recompute in background
        RecommendationService.recomputeRecommendations(mode === 'mood' ? 'mood_logged' : 'symptom_logged')
            .catch(err => console.error("Failed to recompute recommendations:", err));

        navigation.goBack();
    };

    const formatDuration = (mins: number | null) => {
        if (!mins) return null;
        if (mins >= 60) return `${Math.floor(mins/60)}h${mins%60 > 0 ? ` ${mins%60}m` : ''}`;
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
                    <View style={styles.listHeaderRow}>
                        <Text style={styles.listHeaderLabel}>{mode === 'mood' ? 'MOOD OVERVIEW' : 'SYMPTOM OVERVIEW'}</Text>
                        <Text style={styles.listHeaderLabel}>SEVERITY</Text>
                    </View>

                    {entries.map((entry, index) => (
                        <View key={entry.name} style={styles.row}>
                            <View style={styles.rowLeft}>
                                <Text style={styles.rowName}>{entry.name}</Text>
                            </View>
                            
                            <View style={styles.rowRight}>
                                <TouchableOpacity 
                                    style={styles.durationBadge}
                                    onPress={() => setActiveDurationIndex(index)}
                                >
                                    <Clock size={16} color={entry.durationMinutes ? Colors.interactive : Colors.outline} />
                                    {entry.durationMinutes && (
                                        <Text style={styles.durationText}>{formatDuration(entry.durationMinutes)}</Text>
                                    )}
                                </TouchableOpacity>
                                <View style={styles.sliderWrapper}>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={0}
                                        maximumValue={5}
                                        step={1}
                                        value={entry.severity}
                                        onValueChange={(val) => updateSeverity(index, val)}
                                        minimumTrackTintColor={entry.severity > 0 ? getSeverityColor(entry.severity) : Colors.error}
                                        maximumTrackTintColor={Colors.divider}
                                        thumbTintColor={entry.severity > 0 ? getSeverityColor(entry.severity) : Colors.outline}
                                    />
                                </View>
                                <Text style={[styles.severityValue, entry.severity > 0 && { color: Colors.onSurface, fontWeight: '700' }]}>
                                    {Math.round(entry.severity)}
                                </Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.customRow}>
                        <TextInput
                            style={styles.customInput}
                            placeholder={mode === 'mood' ? "Add custom mood..." : "Add custom symptom..."}
                            placeholderTextColor={Colors.outline}
                            value={customSymptom}
                            onChangeText={setCustomSymptom}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.stickyFooter}>
                <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Save & Exit</Text>
                </TouchableOpacity>
            </View>

            {/* Duration Picker Modal */}
            <Modal
                transparent={true}
                visible={activeDurationIndex !== null}
                animationType="fade"
                onRequestClose={() => setActiveDurationIndex(null)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveDurationIndex(null)}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Set Duration for {activeDurationIndex !== null ? entries[activeDurationIndex]?.name : ''}</Text>
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
    header: { 
        backgroundColor: Colors.surfaceLowest,
        paddingTop: Platform.OS === 'ios' ? 50 : 20, 
        paddingBottom: 16, 
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
    headerButton: { fontSize: 16, color: Colors.interactive },
    
    contentContainer: { paddingBottom: 40 },
    
    dateTimeRow: { 
        flexDirection: 'row', 
        backgroundColor: Colors.surfaceLowest, 
        paddingVertical: 14, 
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    dateTimeButton: { flexDirection: 'row', alignItems: 'center' },
    dateTimeText: { color: Colors.onSurfaceVariant, fontSize: 16, fontWeight: '500' },
    
    iosPickerContainer: { backgroundColor: Colors.surfaceContainerLow, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: Colors.border },
    iosPickerDoneButton: { padding: 12, alignItems: 'center', backgroundColor: Colors.border },
    iosPickerDoneText: { color: Colors.interactive, fontSize: 16, fontWeight: '600' },

    listContainer: {
        marginTop: 24,
        backgroundColor: Colors.surfaceLowest,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider
    },
    listHeaderLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.onSurfaceVariant,
        letterSpacing: 0.5
    },
    
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider
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
        fontWeight: '500',
        marginBottom: 4
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
        color: Colors.interactive,
        fontWeight: '600'
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
    severityValue: {
        width: 24,
        textAlign: 'right',
        fontSize: 16,
        color: Colors.outline,
        fontVariant: ['tabular-nums']
    },

    customRow: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: Colors.surfaceLowest
    },
    customInput: {
        fontSize: 15,
        color: Colors.onSurfaceVariant,
        fontStyle: 'italic'
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
        backgroundColor: Colors.divider,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border
    },
    presetTagSelected: {
        backgroundColor: Colors.info + '1A', // info muted
        borderColor: Colors.info
    },
    presetTagText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.onSurfaceVariant
    },
    presetTagTextSelected: {
        color: Colors.interactive
    },
    modalClearButton: {
        paddingVertical: 10
    },
    modalClearText: {
        color: Colors.error,
        fontSize: 15,
        fontWeight: '600'
    },
    saveButton: { 
        backgroundColor: Colors.interactive, 
        borderRadius: 12, 
        paddingVertical: 16, 
        alignItems: 'center' 
    },
    saveButtonText: { 
        color: Colors.onPrimaryContrast, 
        fontSize: 16, 
        fontWeight: '700' 
    },
    stickyFooter: {
        padding: 16,
        backgroundColor: Colors.surfaceLowest,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16 // Account for safe area
    }
});
