import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Plus, X, Utensils, Beaker, Thermometer } from 'lucide-react-native';
import { Colors, Shadows } from '../../constants/Theme';

interface SmartFABProps {
  hasActiveExperiment: boolean;
  onLogMeal: () => void;
  onLogSymptom: () => void;
  onLogMood: () => void;
  onLogProgress: () => void;
}

export const SmartFAB: React.FC<SmartFABProps> = ({ 
  hasActiveExperiment, 
  onLogMeal, 
  onLogSymptom, 
  onLogMood,
  onLogProgress 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const animation = React.useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const isEvening = () => {
    const hour = new Date().getHours();
    return hour >= 18 || hour <= 4;
  };

  // Primary action logic
  const getPrimaryAction = () => {
    if (hasActiveExperiment) return { label: 'Log Progress', icon: <Beaker size={24} color={Colors.onPrimaryContrast} />, action: onLogProgress, color: Colors.experiment };
    if (isEvening()) return { label: 'Log Symptoms', icon: <Thermometer size={24} color={Colors.onPrimaryContrast} />, action: onLogSymptom, color: Colors.error };
    return { label: 'Log Meal', icon: <Utensils size={24} color={Colors.onPrimaryContrast} />, action: onLogMeal, color: Colors.interactive };
  };

  const primary = getPrimaryAction();

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const menuOpacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.container}>
      {isOpen && (
        <Animated.View style={[styles.menu, { opacity: menuOpacity, transform: [{ translateY: menuTranslateY }] }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { onLogMeal(); toggleMenu(); }}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.success }]}>
              <Utensils size={20} color={Colors.onPrimaryContrast} />
            </View>
            <Text style={styles.menuLabel}>Log Meal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { onLogSymptom(); toggleMenu(); }}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.error }]}>
              <Thermometer size={20} color={Colors.onPrimaryContrast} />
            </View>
            <Text style={styles.menuLabel}>Log Symptom</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => { onLogMood(); toggleMenu(); }}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.experiment }]}>
              <Text style={{ fontSize: 18 }}>😊</Text>
            </View>
            <Text style={styles.menuLabel}>Log Mood</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: isOpen ? Colors.onSurfaceVariant : primary.color }]} 
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          {isOpen ? <X size={28} color={Colors.onPrimaryContrast} /> : <Plus size={32} color={Colors.onPrimaryContrast} />}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    right: 30,
    alignItems: 'flex-end',
  },
  menu: {
    marginBottom: 16,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceLowest,
    padding: 8,
    borderRadius: 24,
    ...Shadows.ambient,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
    marginRight: 8,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.ambient,
    elevation: 6,
  },
  fabLabel: {
    color: Colors.onPrimaryContrast,
    fontWeight: '700',
    fontSize: 15,
  },
});
