import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import type { BuyerProductItem } from '@/types/catalog';
import { resolveMediaUrl } from '@/utils/media';

type HomeRecommendedProductCardProps = {
  item: BuyerProductItem;
  onPress: () => void;
};

export function HomeRecommendedProductCard({ item, onPress }: HomeRecommendedProductCardProps) {
  const imageUri = resolveMediaUrl(item.cover_image);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {item.subtitle || item.shop.shop_name}
        </Text>
        <Text style={styles.price}>
          ¥ {item.price.toFixed(1)}
          <Text style={styles.unit}>/{item.unit || '件'}</Text>
        </Text>
        <Text numberOfLines={1} style={styles.shop}>
          {item.shop.shop_name}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7ECE6',
    marginBottom: spacing.lg,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E8ECE8',
  },
  coverPlaceholder: {
    backgroundColor: '#E3E8E2',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  name: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textStrong,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#7B8597',
  },
  price: {
    marginTop: spacing.md,
    fontSize: 20,
    lineHeight: 28,
    color: '#16A34A',
    fontWeight: '700',
  },
  unit: {
    color: '#7B8597',
    fontWeight: '400',
  },
  shop: {
    marginTop: spacing.sm,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#7B8597',
  },
});
