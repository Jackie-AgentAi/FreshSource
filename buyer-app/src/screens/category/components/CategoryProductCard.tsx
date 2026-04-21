import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuyerProductItem } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type CategoryProductCardProps = {
  item: BuyerProductItem;
  onPress: () => void;
};

export function CategoryProductCard({ item, onPress }: CategoryProductCardProps) {
  const imageUri = resolveMediaUrl(item.cover_image);
  const priceText =
    typeof item.price === 'number' && !Number.isNaN(item.price) ? `¥${item.price.toFixed(2)}` : '¥--';
  const unitLabel = item.unit || '件';

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons color="#98B69E" name="image-outline" size={22} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.unitTag}>
            <Text style={styles.unitTagText}>{unitLabel}</Text>
          </View>
          {item.stock <= 0 ? (
            <View style={styles.stockTag}>
              <Text style={styles.stockTagText}>已售罄</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{priceText}</Text>
          <Text style={styles.priceUnit}>/{unitLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E4ECE5',
    overflow: 'hidden',
    ...elevation.sm,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F1F6F1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF5EE',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  name: {
    minHeight: 44,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '600',
  },
  metaRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unitTag: {
    borderRadius: radius.pill,
    backgroundColor: '#F3F8F3',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  unitTagText: {
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
    color: '#5C7A63',
    fontWeight: '600',
  },
  stockTag: {
    borderRadius: radius.pill,
    backgroundColor: colors.statusDangerBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  stockTagText: {
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
    color: colors.statusDangerText,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  price: {
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    color: '#18A84A',
    fontWeight: '800',
  },
  priceUnit: {
    marginBottom: 1,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
  },
});
