import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';

export function SellerMetricCard({
  label,
  value,
  hint,
  icon,
  onPress,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.header}>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 110,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 16,
    ...sellerShadow,
  },
  cardPressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: sellerColors.muted,
    marginBottom: 6,
  },
  value: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: sellerColors.foreground,
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: sellerColors.primary,
    fontWeight: '600',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
