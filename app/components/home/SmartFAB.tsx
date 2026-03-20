import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Plus, X, Utensils, Beaker, Thermometer } from 'lucide-react-native';

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
    if (hasActiveExperiment) return { label: 'Log Progress', icon: <Beaker size={24} color="#fff" />, action: onLogProgress, color: '#8b5cf6' };
    if (isEvening()) return { label: 'Log Symptoms', icon: <Thermometer size={24} color="#fff" />, action: onLogSymptom, color: '#ef4444' };
    return { label: 'Log Meal', icon: <Utensils size={24} color="#fff" />, action: onLogMeal, color: '#3b82f6' };
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
            <View style={[styles.menuIcon, { backgroundColor: '#10b981' }]}>
              <Utensils size={20} color="#fff" />
            </View>
            <Text style={styles.menuLabel}>Log Meal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { onLogSymptom(); toggleMenu(); }}>
            <View style={[styles.menuIcon, { backgroundColor: '#ef4444' }]}>
              <Thermometer size={20} color="#fff" />
            </View>
            <Text style={styles.menuLabel}>Log Symptom</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => { onLogMood(); toggleMenu(); }}>
            <View style={[styles.menuIcon, { backgroundColor: '#8b5cf6' }]}>
              <Text style={{ fontSize: 18 }}>😊</Text>
            </View>
            <Text style={styles.menuLabel}>Log Mood</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: isOpen ? '#4b5563' : primary.color }]} 
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          {isOpen ? <X size={28} color="#fff" /> : <Plus size={32} color="#fff" />}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
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
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#1f2937',
    marginRight: 8,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
