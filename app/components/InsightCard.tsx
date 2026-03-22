import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Insight } from '../../src/models/types';
import { Sparkles, Shield, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radii, Shadows } from '../constants/Theme';

interface InsightCardProps {
  insight: Insight;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const isPrediction = insight.type === 'prediction';
  const isTrigger = insight.type === 'correlation' || insight.type === 'trigger_pattern' || insight.type === 'mood_trigger';
  const isProtective = insight.type === 'protective';
  
  let iconColor = Colors.accent;
  let badgeBg = Colors.surfaceContainerLow;
  let badgeColor = Colors.onSurfaceVariant;

  if (isPrediction) {
    iconColor = Colors.accent;
    badgeBg = Colors.accentContainer;
    badgeColor = Colors.onAccentContainer;
  } else if (isTrigger) {
    iconColor = Colors.warning;
    badgeBg = Colors.warningContainer;
    badgeColor = Colors.onWarningContainer;
  } else if (isProtective) {
    iconColor = Colors.success;
    badgeBg = Colors.successContainer;
    badgeColor = Colors.onSuccessContainer;
  }

  const Icon = isPrediction ? AlertTriangle 
    : isTrigger ? Sparkles 
    : isProtective ? Shield 
    : TrendingUp;
  
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Icon color={iconColor} size={20} />
        </View>
        <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.typeBadgeText, { color: badgeColor }]}>
            {insight.type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{insight.title}</Text>
      <Text style={styles.cardDescription}>{insight.summary}</Text>
      <View style={styles.footer}>
        <Text style={styles.confidenceText}>
          CONFIDENCE: {insight.confidenceLevel.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLowest,
    borderRadius: Radii.xl,
    padding: 24,
    marginBottom: Spacing.s4,
    ...Shadows.ambient,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    ...Typography.label,
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    ...Typography.title,
    fontSize: 18,
    marginBottom: 8,
    color: Colors.onSurface,
  },
  cardDescription: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
    paddingTop: 12,
  },
  confidenceText: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.outline,
    fontWeight: '700',
  },
});
