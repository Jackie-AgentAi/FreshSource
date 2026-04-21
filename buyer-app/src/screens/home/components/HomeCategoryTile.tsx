import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveCategoryImageSource } from '@/constants/categoryAssets';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import type { CategoryTreeNode } from '@/types/catalog';

type HomeCategoryTileProps = {
  category: CategoryTreeNode;
  emoji: string;
  onPress: () => void;
};

export function HomeCategoryTile({ category, emoji, onPress }: HomeCategoryTileProps) {
  const iconSource = resolveCategoryImageSource({
    icon: category.icon,
    name: category.name,
  });

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.tile}>
      <View style={styles.iconShell}>
        {iconSource ? (
          <Image source={iconSource} resizeMode="cover" style={styles.iconImage} />
        ) : (
          <Text style={styles.emoji}>{emoji}</Text>
        )}
      </View>
      <Text numberOfLines={1} style={styles.label}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconShell: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: '#F1F4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconImage: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
  },
  emoji: {
    fontSize: 38,
    lineHeight: 42,
  },
  label: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '500',
  },
});
