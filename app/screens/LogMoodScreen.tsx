import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { MoodValence, MoodEnergy, MoodStress, MoodTag, MoodEvent } from '../../src/models/types';
import { StorageService } from '../../src/services/storage';
import { v4 as uuidv4 } from 'uuid';

type LogMoodScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LogMood'>;

const MOOD_TAGS: MoodTag[] = ['anxious', 'bored', 'sad', 'angry', 'lonely', 'celebratory'];

export default function LogMoodScreen() {
    const navigation = useNavigation<LogMoodScreenNavigationProp>();

    // Default stats
    const [valence, setValence] = useState<MoodValence>('neutral');
    const [energy, setEnergy] = useState<MoodEnergy>('ok');
    const [stress, setStress] = useState<MoodStress>('low');
    const [selectedTag, setSelectedTag] = useState<MoodTag | undefined>(undefined);

    const route = useRoute<RouteProp<RootStackParamList, 'LogMood'>>();
    const { timestamp, mealId } = route.params || {};

    const handleSave = async () => {
        const newMood: MoodEvent = {
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            occurredAt: timestamp || new Date().toISOString(),
            valence,
            energy,
            stress,
            tag: selectedTag,
            linkedMealEventId: mealId,
        };

        await StorageService.addMoodEvent(newMood);
        navigation.popToTop(); // Go back to Timeline
    };

    const SegmentControl = <T extends string>({
        options, value, onChange, label
    }: {
        options: T[], value: T, onChange: (v: T) => void, label: string
    }) => (
        <View style={styles.segmentContainer}>
            <Text style={styles.segmentLabel}>{label}</Text>
            <View style={styles.segmentRow}>
                {options.map(opt => (
                    <TouchableOpacity
                        key={opt}
                        style={[styles.segmentBtn, value === opt && styles.segmentBtnSelected]}
                        onPress={() => onChange(opt)}
                    >
                        <Text style={[styles.segmentBtnText, value === opt && styles.segmentBtnTextSelected]}>
                            {opt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.header}>How are you feeling?</Text>

                <SegmentControl
                    label="Valence"
                    options={['negative', 'neutral', 'positive']}
                    value={valence}
                    onChange={setValence}
                />

                <SegmentControl
                    label="Energy"
                    options={['low', 'ok', 'high']}
                    value={energy}
                    onChange={setEnergy}
                />

                <SegmentControl
                    label="Stress"
                    options={['low', 'medium', 'high']}
                    value={stress}
                    onChange={setStress}
                />

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
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Finish</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 20 },
    header: { fontSize: 24, fontWeight: '700', marginBottom: 32, textAlign: 'center' },

    segmentContainer: { marginBottom: 24 },
    segmentLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, textTransform: 'uppercase' },
    segmentRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4 },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    segmentBtnSelected: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    segmentBtnText: { color: '#6b7280', fontWeight: '500', textTransform: 'capitalize' },
    segmentBtnTextSelected: { color: '#111827', fontWeight: '700' },

    section: { marginTop: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#111827' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    tagChip: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#f3f4f6', marginRight: 8, marginBottom: 8,
        borderWidth: 1, borderColor: 'transparent'
    },
    tagChipSelected: { backgroundColor: '#bfdbfe', borderColor: '#2563eb' },
    tagText: { fontSize: 14, color: '#374151', textTransform: 'capitalize' },
    tagTextSelected: { color: '#1e40af', fontWeight: '500' },

    footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
    saveButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
