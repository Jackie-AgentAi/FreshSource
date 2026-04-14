import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuyerProductItem } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type Props = {
  item: BuyerProductItem;
  onPress: () => void;
  onAddToCart?: (item: BuyerProductItem) => void;
  compact?: boolean;
};

export function ProductCard({ item, onPress, onAddToCart, compact = false }: Props) {
  const uri = resolveMediaUrl(item.cover_image);
  const priceText =
    typeof item.price === 'number' && !Number.isNaN(item.price) ? `¥${item.price.toFixed(2)}` : '—';
  const originalPriceText =
    typeof item.original_price === 'number' && item.original_price > 0
      ? `¥${item.original_price.toFixed(2)}`
      : '';
  const shopLabel = item.shop?.shop_name || '店铺';
  const stockLabel = item.stock > 0 ? `库存 ${item.stock}` : '库存不足';
  const buyStep = item.step_buy > 0 ? `步长 ${item.step_buy}${item.unit || ''}` : '';
  const addDisabled = !item.can_buy;

  return (
    <Pressable style={[styles.card, compact && styles.cardCompact]} onPress={onPress} accessibilityRole="button">
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
        {!!item.subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}

        <View style={styles.shopRow}>
          <Text style={styles.shop} numberOfLines={1}>
            {shopLabel}
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{priceText}</Text>
          {originalPriceText ? <Text style={styles.originalPrice}>{originalPriceText}</Text> : null}
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {item.unit ? `单位 ${item.unit}` : '单位 -'} · {stockLabel}
        </Text>
        {!!buyStep && <Text style={styles.metaMuted}>{buyStep}</Text>}

        <View style={styles.actionRow}>
          <View style={styles.minBuyTag}>
            <Text style={styles.minBuyText}>起购 {item.min_buy}{item.unit || ''}</Text>
          </View>
          <Pressable
            style={[styles.addBtn, addDisabled && styles.addBtnDisabled]}
            disabled={addDisabled}
            onPress={() => (onAddToCart ? onAddToCart(item) : onPress())}
          >
            <Text style={[styles.addBtnText, addDisabled && styles.addBtnTextDisabled]}>
              {addDisabled ? '不可购' : '加购'}
            </Text>
          </Pressable>
        </View>
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
    ...elevation.sm,
  },
  cardCompact: {
    margin: spacing.xxs,
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
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  name: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '600',
    minHeight: 44,
  },
  subtitle: {
    marginTop: spacing.xxs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  shopRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shop: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
  },
  priceRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  originalPrice: {
    marginLeft: spacing.xs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
  },
  meta: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  metaMuted: {
    marginTop: 1,
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
    color: colors.textMuted,
  },
  actionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  minBuyTag: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  minBuyText: {
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
    color: colors.textSecondary,
  },
  addBtn: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
  },
  addBtnDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.borderStrong,
  },
  addBtnText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  addBtnTextDisabled: {
    color: colors.textDisabled,
  },
});
