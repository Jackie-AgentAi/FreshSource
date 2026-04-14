import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

export function LoadingView({ message = '加载中…' }: { message?: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <View style={styles.panel}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>{message}</Text>
        <Text style={styles.text}>正在同步最新数据，请稍候</Text>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
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
    minHeight: 120,
  },
  panel: {
    minWidth: 220,
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...elevation.sm,
  },
  title: {
    marginTop: spacing.md,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '600',
    textAlign: 'center',
  },
  text: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dots: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.round,
    backgroundColor: colors.primarySoft,
  },
});
