import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
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
  title: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  desc: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
