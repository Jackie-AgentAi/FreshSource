import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <View style={styles.iconLine} />
          <View style={styles.iconLineShort} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
        {actionText && onAction ? (
          <Pressable style={styles.btn} onPress={onAction} accessibilityRole="button">
            <Text style={styles.btnText}>{actionText}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 160,
  },
  panel: {
    minWidth: 240,
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...elevation.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconLine: {
    width: 20,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.textDisabled,
    marginBottom: spacing.xs,
  },
  iconLineShort: {
    width: 12,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.textDisabled,
  },
  title: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '600',
    textAlign: 'center',
  },
  desc: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  btnText: {
    color: colors.primary,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
});
