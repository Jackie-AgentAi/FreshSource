import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CartItemView, CartShopGroup } from '@/types/cart';
import { colors, elevation, radius, spacing } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type CartShopCardProps = {
  group: CartShopGroup;
  manageMode: boolean;
  selectedIds: Set<number>;
  shopSelected: boolean;
  onDeleteItem: (item: CartItemView) => void;
  onOpenItem: (item: CartItemView) => void;
  onToggleItem: (item: CartItemView) => void;
  onToggleShop: (group: CartShopGroup) => void;
  onUpdateQuantity: (item: CartItemView, next: number) => void;
};

export function CartShopCard({
  group,
  manageMode,
  selectedIds,
  shopSelected,
  onDeleteItem,
  onOpenItem,
  onToggleItem,
  onToggleShop,
  onUpdateQuantity,
}: CartShopCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.shopHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onToggleShop(group)}
          style={[styles.selector, shopSelected && styles.selectorActive]}
        >
          {shopSelected ? <Ionicons color="#FFFFFF" name="checkmark" size={14} /> : null}
        </Pressable>
        <Ionicons color={colors.primary} name="storefront-outline" size={18} />
        <Text numberOfLines={1} style={styles.shopName}>
          {group.shop?.shop_name || `店铺 #${group.shop_id}`}
        </Text>
      </View>

      {group.items.map((item, index) => {
        const imageUri = resolveMediaUrl(item.product?.cover_image);
        const selected = selectedIds.has(item.id);
        const disabled = item.is_invalid;
        const quantity = Number(item.quantity || 0);

        return (
          <View key={item.id} style={[styles.row, index < group.items.length - 1 && styles.rowBorder]}>
            <Pressable
              accessibilityRole="button"
              disabled={!manageMode && disabled}
              onPress={() => onToggleItem(item)}
              style={[
                styles.selector,
                selected && styles.selectorActive,
                disabled && !manageMode && styles.selectorDisabled,
              ]}
            >
              {selected ? <Ionicons color="#FFFFFF" name="checkmark" size={14} /> : null}
            </Pressable>

            <Pressable accessibilityRole="button" onPress={() => onOpenItem(item)} style={styles.thumbWrap}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={[styles.thumb, disabled && styles.thumbDisabled]} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, disabled && styles.thumbDisabled]} />
              )}
            </Pressable>

            <View style={styles.body}>
              <View style={styles.rowTop}>
                <View style={styles.nameWrap}>
                  <Text numberOfLines={1} style={[styles.name, disabled && styles.disabledText]}>
                    {item.product?.name || '商品'}
                  </Text>
                  <Text numberOfLines={1} style={[styles.subtitle, disabled && styles.disabledText]}>
                    {item.product?.unit ? `规格 ${item.product.unit}` : '精选食材'}
                  </Text>
                  {disabled ? <Text style={styles.invalidText}>商品已下架</Text> : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => onDeleteItem(item)}
                  style={styles.deleteButton}
                >
                  <Ionicons color="#9CA3AF" name="trash-outline" size={18} />
                </Pressable>
              </View>

              <View style={styles.rowBottom}>
                <View style={styles.priceWrap}>
                  <Text style={[styles.priceCurrency, disabled && styles.disabledPrice]}>¥</Text>
                  <Text style={[styles.price, disabled && styles.disabledPrice]}>
                    {Number(item.product?.price ?? 0).toFixed(1)}
                  </Text>
                  <Text style={[styles.unit, disabled && styles.disabledText]}>
                    /{item.product?.unit || '件'}
                  </Text>
                </View>

                <View style={styles.quantityWrap}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled || quantity <= 1}
                    onPress={() => onUpdateQuantity(item, Math.max(1, quantity - 1))}
                    style={[styles.qtyButton, (disabled || quantity <= 1) && styles.qtyButtonDisabled]}
                  >
                    <Ionicons color="#1A1A1A" name="remove" size={14} />
                  </Pressable>
                  <Text style={[styles.quantityText, disabled && styles.disabledText]}>{quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => onUpdateQuantity(item, quantity + 1)}
                    style={[styles.qtyButton, styles.qtyButtonActive, disabled && styles.qtyButtonDisabled]}
                  >
                    <Ionicons color="#FFFFFF" name="add" size={14} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...elevation.sm,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shopName: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selector: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  selectorActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  selectorDisabled: {
    opacity: 0.45,
  },
  thumbWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8EDE8',
  },
  thumbPlaceholder: {
    backgroundColor: '#E8EDE8',
  },
  thumbDisabled: {
    opacity: 0.5,
  },
  body: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  name: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  invalidText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  deleteButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBottom: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  priceCurrency: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  price: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginLeft: 1,
  },
  disabledPrice: {
    color: '#A7B0AC',
  },
  unit: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 2,
  },
  quantityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  qtyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  quantityText: {
    minWidth: 22,
    textAlign: 'center',
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  disabledText: {
    color: '#9CA3AF',
  },
});
