import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CartItemView, CartShopGroup } from '@/types/cart';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type CartShopCardProps = {
  group: CartShopGroup;
  manageMode: boolean;
  selectedIds: Set<number>;
  onDeleteItem: (item: CartItemView) => void;
  onOpenItem: (item: CartItemView) => void;
  onToggleItem: (item: CartItemView) => void;
  onUpdateQuantity: (item: CartItemView, next: number) => void;
};

export function CartShopCard({
  group,
  manageMode,
  selectedIds,
  onDeleteItem,
  onOpenItem,
  onToggleItem,
  onUpdateQuantity,
}: CartShopCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.shopName}>{group.shop?.shop_name || `店铺 #${group.shop_id}`}</Text>
      {group.items.map((item, index) => {
        const imageUri = resolveMediaUrl(item.product?.cover_image);
        const selected = selectedIds.has(item.id);
        const disabled = item.is_invalid;
        const quantity = Number(item.quantity || 0);

        return (
          <View
            key={item.id}
            style={[styles.row, index < group.items.length - 1 && styles.rowBorder]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={!manageMode && disabled}
              onPress={() => onToggleItem(item)}
              style={[styles.selector, selected && styles.selectorActive, disabled && styles.selectorDisabled]}
            >
              {selected ? <Ionicons color={colors.surface} name="checkmark" size={16} /> : null}
            </Pressable>

            <Pressable accessibilityRole="button" onPress={() => onOpenItem(item)}>
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
                </View>
                <Pressable accessibilityRole="button" onPress={() => onDeleteItem(item)} style={styles.deleteButton}>
                  <Ionicons color="#6B7280" name="trash-outline" size={26} />
                </Pressable>
              </View>

              {disabled ? <Text style={styles.invalidText}>商品已下架</Text> : null}

              <View style={styles.rowBottom}>
                <Text style={[styles.price, disabled && styles.disabledPrice]}>
                  ¥ {Number(item.product?.price ?? 0).toFixed(1)}
                  <Text style={styles.unit}>/{item.product?.unit || '件'}</Text>
                </Text>
                <View style={styles.quantityWrap}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled || quantity <= 1}
                    onPress={() => onUpdateQuantity(item, Math.max(1, quantity - 1))}
                    style={[styles.qtyButton, (disabled || quantity <= 1) && styles.qtyButtonDisabled]}
                  >
                    <Text style={styles.qtyButtonText}>-</Text>
                  </Pressable>
                  <Text style={[styles.quantityText, disabled && styles.disabledText]}>{quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => onUpdateQuantity(item, quantity + 1)}
                    style={[styles.qtyButton, disabled && styles.qtyButtonDisabled, styles.qtyButtonActive]}
                  >
                    <Text style={styles.qtyButtonActiveText}>+</Text>
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5EAE4',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  shopName: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    fontSize: 24,
    lineHeight: 32,
    color: colors.textStrong,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8EDE8',
  },
  selector: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D7DED9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.surface,
  },
  selectorActive: {
    borderColor: '#18A84A',
    backgroundColor: '#18A84A',
  },
  selectorDisabled: {
    opacity: 0.4,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#E4EAE2',
  },
  thumbDisabled: {
    opacity: 0.45,
  },
  thumbPlaceholder: {
    backgroundColor: '#E4EAE2',
  },
  body: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  name: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#7B8597',
  },
  deleteButton: {
    width: 32,
    alignItems: 'center',
  },
  invalidText: {
    marginTop: spacing.sm,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#F87171',
  },
  rowBottom: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 20,
    lineHeight: 28,
    color: '#18A84A',
    fontWeight: '700',
  },
  disabledPrice: {
    color: '#9ED9B4',
  },
  unit: {
    color: '#7B8597',
    fontWeight: '400',
  },
  quantityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE4DE',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.35,
  },
  qtyButtonActive: {
    backgroundColor: '#18A84A',
    borderColor: '#18A84A',
  },
  qtyButtonText: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textStrong,
    fontWeight: '500',
  },
  qtyButtonActiveText: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.surface,
    fontWeight: '500',
  },
  quantityText: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 28,
    color: colors.textStrong,
    fontWeight: '500',
  },
  disabledText: {
    color: '#A1A7B1',
  },
});
