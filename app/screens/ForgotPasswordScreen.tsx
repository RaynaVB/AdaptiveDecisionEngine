import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { auth } from '../../src/services/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

type ForgotPasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

type Props = {
    navigation: ForgotPasswordNavigationProp;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email address.");
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            Alert.alert(
                "Check your email",
                "If an account exists with that email, we've sent instructions to reset your password.",
                [{ text: "OK", onPress: () => navigation.navigate('Login') }]
            );
        } catch (error: any) {
            // Depending heavily on error codes makes security worse by leaking emails.
            // But if requested we can distinguish 'auth/user-not-found'
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <Text style={styles.title}>Recover Access</Text>
            <Text style={styles.subtitle}>Enter your email address and we'll send you a secure link to reset your password.</Text>

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

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.onPrimaryContrast} />
                ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
                <Text style={styles.linkText}>Return to <Text style={{ color: Colors.primary, fontWeight: '700' }}>Login</Text></Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.s6,
        justifyContent: 'center',
    },
    title: {
        ...Typography.headline,
        fontSize: 32,
        color: Colors.onSurface,
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    subtitle: {
        ...Typography.body,
        fontSize: 15,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 22,
        paddingHorizontal: 12,
    },
    inputContainer: {
        marginBottom: 32,
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
        marginTop: 12,
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
