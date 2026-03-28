import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../src/models/navigation';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { Colors, Typography, Radii } from '../constants/Theme';
import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_EFFECTIVE_DATE } from '../constants/legal';

type PrivacyPolicyScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PrivacyPolicy'>;

type Props = {
    navigation: PrivacyPolicyScreenNavigationProp;
};

export default function PrivacyPolicyScreen({ navigation }: Props) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft color={Colors.onSurface} size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <View style={styles.iconWrap}>
                        <ShieldCheck size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Your Privacy Matters</Text>
                    <Text style={styles.heroSubtitle}>
                        Veyra is built on a foundation of data minimization and transparency. We never sell your data or share it for advertising.
                    </Text>
                    <View style={styles.effectiveDateBadge}>
                        <Text style={styles.effectiveDateText}>Effective {PRIVACY_POLICY_EFFECTIVE_DATE}</Text>
                    </View>
                </View>

                <View style={styles.highlightRow}>
                    <HighlightPill icon="🔒" text="Encrypted storage" />
                    <HighlightPill icon="🚫" text="No ad tracking" />
                    <HighlightPill icon="📱" text="Name stays on device" />
                </View>

                {PRIVACY_POLICY_SECTIONS.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionBody}>{section.body}</Text>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Questions about this policy? Contact us at{' '}
                        <Text style={styles.footerEmail}>privacy@veyrahealth.com</Text>
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function HighlightPill({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.pill}>
            <Text style={styles.pillIcon}>{icon}</Text>
            <Text style={styles.pillText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 8 : 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainer,
    },
    headerTitle: {
        ...Typography.label,
        fontSize: 16,
        fontWeight: '800',
        color: Colors.onSurface,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        width: 44,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 24,
        paddingBottom: 60,
    },
    hero: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        ...Typography.display,
        fontSize: 24,
        color: Colors.onSurface,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 10,
    },
    heroSubtitle: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 14,
    },
    effectiveDateBadge: {
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: Radii.full,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
    },
    effectiveDateText: {
        ...Typography.label,
        fontSize: 11,
        color: Colors.onSurfaceVariant,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    highlightRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 32,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primarySubtle,
        borderRadius: Radii.full,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    pillIcon: {
        fontSize: 14,
    },
    pillText: {
        ...Typography.label,
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
    },
    section: {
        marginBottom: 28,
        paddingBottom: 28,
        borderBottomWidth: 1,
        borderBottomColor: Colors.surfaceContainer,
    },
    sectionTitle: {
        ...Typography.label,
        fontSize: 13,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionBody: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.onSurfaceVariant,
        lineHeight: 22,
    },
    footer: {
        marginTop: 8,
        padding: 20,
        backgroundColor: Colors.surfaceContainerLow,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.surfaceContainer,
    },
    footerText: {
        ...Typography.body,
        fontSize: 13,
        color: Colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 20,
    },
    footerEmail: {
        color: Colors.primary,
        fontWeight: '700',
    },
});
