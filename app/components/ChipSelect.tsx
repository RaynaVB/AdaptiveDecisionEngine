import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ChipSelectProps {
    options: string[];
    selectedOptions: string[];
    onToggle: (option: string) => void;
    maxSelections?: number;
    category?: string;
}

export const ChipSelect: React.FC<ChipSelectProps> = ({ 
    options, 
    selectedOptions, 
    onToggle, 
    maxSelections,
    category 
}) => {
    return (
        <View style={styles.container}>
            {category && <Text style={styles.categoryTitle}>{category}</Text>}
            <View style={styles.chipsContainer}>
                {options.map((option) => {
                    const isSelected = selectedOptions.includes(option);
                    const isDisabled = maxSelections && !isSelected && selectedOptions.length >= maxSelections;

                    return (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                                isDisabled ? styles.chipDisabled : null
                            ]}
                            onPress={() => onToggle(option)}
                            disabled={!!isDisabled}
                        >
                            <Text style={[
                                styles.chipText,
                                isSelected && styles.chipTextSelected
                            ]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    chipSelected: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    chipDisabled: {
        opacity: 0.5,
    },
    chipText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#2563eb',
        fontWeight: '600',
    },
});
