import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuyerProductItem } from '@/types/catalog';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type Props = {
  item: BuyerProductItem;
  onPress: () => void;
};

export function ProductCard({ item, onPress }: Props) {
  const uri = resolveMediaUrl(item.cover_image);
  const priceText =
    typeof item.price === 'number' && !Number.isNaN(item.price) ? `¥${item.price.toFixed(2)}` : '—';
  const shopLabel = item.shop?.shop_name || '店铺';

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        {!item.can_buy ? <Text style={styles.badge}>不可售</Text> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.shop} numberOfLines={1}>
          {shopLabel}
        </Text>
        <Text style={styles.price}>{priceText}</Text>
        <Text style={styles.unit} numberOfLines={1}>
          {item.unit ? `单位：${item.unit}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#e5e5e5',
  },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: colors.surface,
    fontSize: typography.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  body: {
    padding: spacing.sm,
  },
  name: {
    fontSize: typography.caption,
    color: colors.text,
    fontWeight: '600',
    minHeight: 36,
  },
  shop: {
    marginTop: 4,
    fontSize: typography.small,
    color: colors.textMuted,
  },
  price: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  unit: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
});
