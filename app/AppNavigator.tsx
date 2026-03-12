import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../src/models/navigation';

import TimelineScreen from './screens/TimelineScreen';
import LogMealScreen from './screens/LogMealScreen';
import LogMoodScreen from './screens/LogMoodScreen';
import MealDetailScreen from './screens/MealDetailScreen';
import WeeklyPatternsScreen from './screens/WeeklyPatternsScreen';
import RecommendationFeedScreen from './screens/RecommendationFeedScreen';
import FeedbackHistoryScreen from './screens/FeedbackHistoryScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { auth } from '../src/services/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (usr) => {
            setUser(usr);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <Stack.Navigator>
            {user ? (
                // User is signed in
                <Stack.Group>
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
                        options={{ title: 'How are you feeling?' }}
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
                    <Stack.Screen
                        name="Recommendations"
                        component={RecommendationFeedScreen}
                        options={{ title: 'Recommendations' }}
                    />
                    <Stack.Screen
                        name="FeedbackHistory"
                        component={FeedbackHistoryScreen}
                        options={{ title: 'Feedback History' }}
                    />
                </Stack.Group>
            ) : (
                // No user is signed in
                <Stack.Group screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="SignUp" component={SignUpScreen} />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
}
