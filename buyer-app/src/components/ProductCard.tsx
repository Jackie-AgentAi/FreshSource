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
  const stockState = item.stock > 0 ? (item.stock < 20 ? '紧张' : '充足') : '缺货';
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
        <View style={styles.badgeRow}>
          <Text style={item.can_buy ? styles.badgeBrand : styles.badgeDanger}>
            {item.can_buy ? '在售' : '不可售'}
          </Text>
          <Text style={stockState === '充足' ? styles.badgeStock : styles.badgeWarning}>{stockState}</Text>
        </View>
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
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
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#e5e5e5',
  },
  badgeRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badgeBrand: {
    backgroundColor: colors.primarySoft,
    color: colors.primaryPressed,
    fontSize: typography.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontWeight: '700',
  },
  badgeDanger: {
    backgroundColor: colors.statusDangerBg,
    color: colors.statusDangerText,
    fontSize: typography.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontWeight: '700',
  },
  badgeStock: {
    backgroundColor: colors.statusSuccessBg,
    color: colors.statusSuccessText,
    fontSize: typography.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontWeight: '700',
  },
  badgeWarning: {
    backgroundColor: colors.accentSoft,
    color: colors.warning,
    fontSize: typography.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontWeight: '700',
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
    color: colors.primaryPressed,
    fontWeight: '800',
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
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  minBuyText: {
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
    color: colors.primaryPressed,
  },
  addBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  addBtnDisabled: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.borderStrong,
  },
  addBtnText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.warning,
    fontWeight: '800',
  },
  addBtnTextDisabled: {
    color: colors.textDisabled,
  },
});
