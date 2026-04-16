import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, right }: AppHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.main}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  main: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: colors.textStrong,
  },
  subtitle: {
    marginTop: spacing.xxs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
  },
  right: {
    marginLeft: spacing.md,
  },
});
