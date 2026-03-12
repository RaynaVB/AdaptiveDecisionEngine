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

// New onboarding screens
import OnboardingWelcomeScreen from './screens/OnboardingWelcomeScreen';
import OnboardingProfileScreen from './screens/OnboardingProfileScreen';
import OnboardingCompleteScreen from './screens/OnboardingCompleteScreen';

import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { auth } from '../src/services/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../src/services/firebaseConfig';
import { getUserProfile, UserProfile } from '../src/services/userProfile';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeProfile: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (usr) => {
            setUser(usr);
            if (usr) {
                // Ensure profile exists first
                await getUserProfile(usr.uid);
                
                // Then listen for changes
                unsubscribeProfile = onSnapshot(doc(db, 'users', usr.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as UserProfile);
                    }
                });
            } else {
                setProfile(null);
                if (unsubscribeProfile) {
                    unsubscribeProfile();
                }
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
        };
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
                profile?.hasCompletedOnboarding ? (
                    // User is signed in and has completed onboarding
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
                    // User is signed in but HAS NOT completed onboarding
                    <Stack.Group screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
                        <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
                        <Stack.Screen 
                            name="OnboardingComplete" 
                            component={OnboardingCompleteScreen} 
                            // Pass down a callback so the screen can trigger an update in the Navigator state 
                            // to unmount the Onboarding stack and show the main Timeline stack.
                            // However React Navigation doesn't easily support passing params to Screen components this way 
                            // without custom types, so we will handle the profile update at the component level 
                            // and then use an Event emitter or let the user click a button to refresh, 
                            // OR we can pass it via React Context. 
                            // Let's pass it via initialParams for simplicity if possible.
                        />
                    </Stack.Group>
                )
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
