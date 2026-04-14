import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

export function ErrorRetryView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.msg}>{message}</Text>
      <Pressable style={styles.btn} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.btnText}>重试</Text>
      </Pressable>
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
  msg: {
    fontSize: typography.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  btnText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: '600',
  },
});
