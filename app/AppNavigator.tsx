import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../src/models/navigation';

import TimelineScreen from './screens/TimelineScreen';
import LogMealScreen from './screens/LogMealScreen';
import LogMoodScreen from './screens/LogMoodScreen';
import MealDetailScreen from './screens/MealDetailScreen';
import WeeklyPatternsScreen from './screens/WeeklyPatternsScreen';
import { TouchableOpacity, Text } from 'react-native';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <Stack.Navigator initialRouteName="Timeline">
            <Stack.Screen
                name="Timeline"
                component={TimelineScreen}
                options={{ title: 'Timeline' }}
            />
            <Stack.Screen
                name="LogMeal"
                component={LogMealScreen}
                options={({ navigation }) => ({
                    title: 'Log Meal',
                    presentation: 'modal',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
                            <Text style={{ color: '#2563eb', fontSize: 16 }}>Cancel</Text>
                        </TouchableOpacity>
                    )
                })}
            />
            <Stack.Screen
                name="LogMood"
                component={LogMoodScreen}
                options={{ title: 'Log Mood' }}
            />
            <Stack.Screen
                name="MealDetail"
                component={MealDetailScreen}
                options={{ title: 'Meal Details' }}
            />
            <Stack.Screen
                name="WeeklyPatterns"
                component={WeeklyPatternsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}
