import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

export function ErrorRetryView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.panel}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>!</Text>
        </View>
        <Text style={styles.title}>加载失败</Text>
        <Text style={styles.msg}>{message}</Text>
        <Text style={styles.tip}>请检查网络或稍后重试</Text>
        <Pressable style={styles.btn} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.btnText}>重新加载</Text>
        </Pressable>
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
    width: 42,
    height: 42,
    borderRadius: radius.round,
    backgroundColor: colors.statusDangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    color: colors.statusDangerText,
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '700',
    textAlign: 'center',
  },
  msg: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.statusDangerText,
    textAlign: 'center',
  },
  tip: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    minWidth: 120,
    alignItems: 'center',
  },
  btnText: {
    color: colors.surface,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
});
