import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { auth } from '../../src/services/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';
import AppHeader from '../components/AppHeader';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
    navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter email and password.");
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            // The auth state listener in AppNavigator should pick this up
        } catch (error: any) {
            Alert.alert("Login Failed", error.message);
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
                <AppHeader showTagline style={styles.header} />

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
                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotPasswordButton}>
                        <Text style={styles.forgotPasswordText}>Recover Password</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.onPrimaryContrast} />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.linkButton}>
                    <Text style={styles.linkText}>New here? <Text style={{ color: Colors.primary, fontWeight: '700' }}>Create an account</Text></Text>
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
    header: {
        marginBottom: 64,
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
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginTop: 12,
        marginRight: 4,
    },
    forgotPasswordText: {
        ...Typography.label,
        fontSize: 12,
        color: Colors.onSurfaceVariant,
        textTransform: 'none',
        fontWeight: '600',
    },
});
