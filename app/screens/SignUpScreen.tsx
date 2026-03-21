import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { auth } from '../../src/services/firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

type Props = {
    navigation: SignUpScreenNavigationProp;
};

export default function SignUpScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert("Error", "Please fill out all fields.");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password should be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email.trim(), password);
            // The auth state listener in AppNavigator should pick this up
        } catch (error: any) {
            Alert.alert("Sign Up Failed", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Create Account</Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="your@email.com"
                        placeholderTextColor={Colors.onSurfaceVariant + '80'}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor={Colors.onSurfaceVariant + '80'}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor={Colors.onSurfaceVariant + '80'}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSignUp}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.onPrimaryContrast} />
                    ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
                    <Text style={styles.linkText}>Already have an account? <Text style={{ color: Colors.primary, fontWeight: '700' }}>Log In</Text></Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.s6,
        justifyContent: 'center',
    },
    title: {
        ...Typography.headline,
        fontSize: 36,
        color: Colors.onSurface,
        textAlign: 'center',
        marginBottom: 64,
        letterSpacing: -1,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        ...Typography.label,
        color: Colors.onSurfaceVariant,
        marginBottom: 10,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Colors.surfaceLowest,
        borderWidth: 1,
        borderColor: Colors.outline + '20',
        borderRadius: Radii.lg,
        padding: 18,
        fontSize: 16,
        color: Colors.onSurface,
        ...Shadows.ambient,
        shadowOpacity: 0.02,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: Radii.full,
        padding: 20,
        alignItems: 'center',
        marginTop: 24,
        minHeight: 64,
        justifyContent: 'center',
        ...Shadows.ambient,
    },
    buttonDisabled: {
        backgroundColor: Colors.primary + '80',
    },
    buttonText: {
        color: Colors.onPrimaryContrast,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    linkButton: {
        marginTop: 32,
        alignItems: 'center',
        padding: 12,
    },
    linkText: {
        color: Colors.onSurfaceVariant,
        fontSize: 15,
        fontWeight: '500',
    },
});
