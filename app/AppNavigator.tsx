import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../src/models/navigation';

import TimelineScreen from './screens/TimelineScreen';
import LogMealScreen from './screens/LogMealScreen';
import LogMoodScreen from './screens/LogMoodScreen';
import SymptomLoggerScreen from './screens/SymptomLoggerScreen';
import MealDetailScreen from './screens/MealDetailScreen';
import WeeklyPatternsScreen from './screens/WeeklyPatternsScreen';
import InsightFeedScreen from './screens/InsightFeedScreen';
import RecommendationFeedScreen from './screens/RecommendationFeedScreen';
import FeedbackHistoryScreen from './screens/FeedbackHistoryScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HealthLabScreen from './screens/HealthLabScreen';
import ExperimentDetailScreen from './screens/ExperimentDetailScreen';
import ExperimentHistoryScreen from './screens/ExperimentHistoryScreen';
import ExperimentResultScreen from './screens/ExperimentResultScreen';

// New onboarding screens
import OnboardingWelcomeScreen from './screens/OnboardingWelcomeScreen';
import OnboardingProfileScreen from './screens/OnboardingProfileScreen';
import OnboardingCompleteScreen from './screens/OnboardingCompleteScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SettingsScreen from './screens/SettingsScreen';
import AdminScreen from './screens/AdminScreen';

import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { auth } from '../src/services/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../src/services/firebaseConfig';
import { getUserProfile, UserProfile } from '../src/services/userProfile';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Sparkles, Lightbulb, Beaker, TrendingUp, Menu, Bell, Home } from 'lucide-react-native';
import { Colors, Typography } from './constants/Theme';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function HomeStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Timeline" component={TimelineScreen} />
            <Stack.Screen 
                name="MealDetail" 
                component={MealDetailScreen}
                options={{ headerShown: true, title: 'Meal Details' }} 
            />
            <Stack.Screen 
                name="ExperimentDetail" 
                component={ExperimentDetailScreen}
                options={{ headerShown: true, title: 'Experiment Details' }} 
            />
        </Stack.Navigator>
    );
}

function HealthLabStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HealthLab" component={HealthLabScreen} />
            <Stack.Screen 
                name="ExperimentDetail" 
                component={ExperimentDetailScreen}
                options={{ headerShown: true, title: 'Experiment Details' }} 
            />
            <Stack.Screen 
                name="ExperimentHistory" 
                component={ExperimentHistoryScreen}
                options={{ headerShown: true, title: 'Experiment History' }} 
            />
            <Stack.Screen 
                name="ExperimentResult" 
                component={ExperimentResultScreen}
                options={{ headerShown: true, title: 'Experiment Result' }} 
            />
        </Stack.Navigator>
    );
}

function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 85,
                    paddingBottom: 25,
                    backgroundColor: 'transparent',
                },
                tabBarBackground: () => (
                    <View
                        style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', borderTopWidth: 1, borderTopColor: Colors.surfaceContainer }]}
                    />
                ),
                tabBarActiveTintColor: Colors.onSurface,
                tabBarInactiveTintColor: Colors.onSurfaceVariant,
                tabBarLabelStyle: {
                    fontFamily: 'Manrope-Medium',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                },
            }}
        >
            <Tab.Screen 
                name="HomeTab" 
                component={HomeStackNavigator} 
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tab.Screen 
                name="Insights" 
                component={InsightFeedScreen} 
                options={{
                    tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
                }}
            />
            <Tab.Screen 
                name="Recommendations" 
                component={RecommendationFeedScreen} 
                options={{
                    tabBarIcon: ({ color, size }) => <Lightbulb color={color} size={size} />,
                }}
            />
            <Tab.Screen 
                name="HealthLabTab" 
                component={HealthLabStackNavigator} 
                options={{
                    title: 'Health Lab',
                    tabBarIcon: ({ color, size }) => <Beaker color={color} size={size} />,
                }}
            />
            <Tab.Screen 
                name="Weekly" 
                component={WeeklyPatternsScreen} 
                options={{
                    tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
                }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeProfile: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (usr) => {
            setUser(usr);
            if (usr) {
                await getUserProfile(usr.uid);
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                profile?.hasCompletedOnboarding ? (
                    <Stack.Group>
                        <Stack.Screen name="Main" component={MainTabNavigator} />
                        <Stack.Screen
                            name="LogMeal"
                            component={LogMealScreen}
                            options={({ navigation }) => ({
                                headerShown: true,
                                title: 'Log Meal',
                                presentation: 'modal',
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
                                        <Text style={{ color: Colors.primary, fontSize: 16, fontFamily: 'Manrope-Medium' }}>Cancel</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        />
                        <Stack.Screen
                            name="LogMood"
                            component={LogMoodScreen}
                            options={{ headerShown: true, title: 'Log Mood' }}
                        />
                        <Stack.Screen
                            name="SymptomLogger"
                            component={SymptomLoggerScreen}
                            options={({ navigation }) => ({
                                headerShown: true,
                                title: 'Log Symptom',
                                presentation: 'modal',
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
                                        <Text style={{ color: Colors.primary, fontSize: 16, fontFamily: 'Manrope-Medium' }}>Cancel</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        />
                        <Stack.Screen
                            name="MealDetail"
                            component={MealDetailScreen}
                            options={{ headerShown: true, title: 'Meal Details' }}
                        />
                        <Stack.Screen
                            name="WeeklyPatterns"
                            component={WeeklyPatternsScreen}
                        />
                        <Stack.Screen
                            name="InsightFeed"
                            component={InsightFeedScreen}
                            options={{ headerShown: true, title: 'AI Insights' }}
                        />
                        <Stack.Screen
                            name="Recommendations"
                            component={RecommendationFeedScreen}
                            options={{ headerShown: true, title: 'Recommendations' }}
                        />
                        <Stack.Screen
                            name="FeedbackHistory"
                            component={FeedbackHistoryScreen}
                            options={{ headerShown: true, title: 'Feedback History' }}
                        />
                        <Stack.Screen
                            name="HealthLab"
                            component={HealthLabScreen}
                        />
                        <Stack.Screen
                            name="ExperimentDetail"
                            component={ExperimentDetailScreen}
                        />
                        <Stack.Screen
                            name="ExperimentHistory"
                            component={ExperimentHistoryScreen}
                        />
                        <Stack.Screen
                            name="ExperimentResult"
                            component={ExperimentResultScreen}
                        />
                        <Stack.Screen
                            name="Settings"
                            component={SettingsScreen}
                        />
                        <Stack.Screen
                            name="Admin"
                            component={AdminScreen}
                        />
                    </Stack.Group>
                ) : (
                    <Stack.Group screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
                        <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
                        <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
                    </Stack.Group>
                )
            ) : (
                <Stack.Group screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="SignUp" component={SignUpScreen} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    // Add any necessary styles here
});
