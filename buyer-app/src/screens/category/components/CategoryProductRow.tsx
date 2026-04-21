import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuyerProductItem } from '@/types/catalog';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type CategoryProductRowProps = {
  item: BuyerProductItem;
  onAddToCart: () => void;
  onPress: () => void;
};

export function CategoryProductRow({ item, onAddToCart, onPress }: CategoryProductRowProps) {
  const imageUri = resolveMediaUrl(item.cover_image);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {item.subtitle || '新鲜供应'}
        </Text>
        <Text style={styles.sales}>月销 {item.shop.total_sales}</Text>
        <View style={styles.bottomRow}>
          <Text style={styles.price}>
            ¥ {item.price.toFixed(1)}
            <Text style={styles.unit}>/{item.unit || '斤'}</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!item.can_buy}
            onPress={onAddToCart}
            style={[styles.button, !item.can_buy && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>加入购物车</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5EAE4',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cover: {
    width: 132,
    height: 132,
    borderRadius: 20,
    backgroundColor: '#E4EAE2',
  },
  coverPlaceholder: {
    backgroundColor: '#E4EAE2',
  },
  body: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  name: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.textStrong,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#7B8597',
  },
  sales: {
    marginTop: spacing.sm,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#6B7280',
  },
  bottomRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  price: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    color: '#18A84A',
    fontWeight: '700',
  },
  unit: {
    color: '#7B8597',
    fontWeight: '400',
  },
  button: {
    minWidth: 132,
    borderRadius: 20,
    backgroundColor: '#18A84A',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#BDE7CC',
  },
  buttonText: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.surface,
    fontWeight: '700',
  },
});
