import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OnboardingOption } from '../constants/options';
import { Colors, Typography, Spacing, Radii } from '../constants/Theme';

interface ChipSelectProps {
    options: OnboardingOption[];
    selectedOptions: string[];
    onToggle: (value: string) => void;
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
                    const isSelected = selectedOptions.includes(option.value);
                    const isDisabled = maxSelections && !isSelected && selectedOptions.length >= maxSelections;

                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                                isDisabled ? styles.chipDisabled : null
                            ]}
                            onPress={() => onToggle(option.value)}
                            disabled={!!isDisabled}
                        >
                            <Text style={[
                                styles.chipText,
                                isSelected && styles.chipTextSelected
                            ]}>
                                {option.label}
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
        marginBottom: Spacing.s4,
    },
    categoryTitle: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        marginBottom: Spacing.s2,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.s2,
    },
    chip: {
        backgroundColor: Colors.surfaceLowest,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
        borderRadius: Radii.full,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    chipSelected: {
        backgroundColor: Colors.primaryContainer,
        borderColor: Colors.primary,
    },
    chipDisabled: {
        opacity: 0.4,
    },
    chipText: {
        color: Colors.onSurfaceVariant,
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextSelected: {
        color: Colors.onPrimaryContainer,
        fontWeight: '700',
    },
});
