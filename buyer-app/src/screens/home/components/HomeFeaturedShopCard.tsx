import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

export type HomeFeaturedShop = {
  id: number;
  shop_name: string;
  logo: string;
  cover_image: string;
  rating: number;
  total_sales: number;
  tags: string[];
};

type HomeFeaturedShopCardProps = {
  shop: HomeFeaturedShop;
  onPress: () => void;
};

export function HomeFeaturedShopCard({ shop, onPress }: HomeFeaturedShopCardProps) {
  const imageUri = resolveMediaUrl(shop.logo) || resolveMediaUrl(shop.cover_image);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>
          {shop.shop_name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons color="#F59E0B" name="star" size={16} />
          <Text style={styles.metaText}>{shop.rating.toFixed(1)}</Text>
          <Text style={styles.metaText}>月销 {shop.total_sales}</Text>
        </View>
        <View style={styles.tagsRow}>
          {shop.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7ECE6',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cover: {
    width: 128,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#E8ECE8',
  },
  coverPlaceholder: {
    backgroundColor: '#E3E8E2',
  },
  content: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaText: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#6B7280',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    backgroundColor: '#E9F7EE',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    color: '#22A559',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
});
