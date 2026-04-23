import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchAddresses } from '@/api/address';
import { fetchBuyerProducts, fetchCategoryTree } from '@/api/catalog';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { resolveCategoryImageSource } from '@/constants/categoryAssets';
import { useAuthStore } from '@/store/auth';
import type { UserAddress } from '@/types/address';
import type { BuyerProductItem, BuyerShopVO, CategoryTreeNode } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type ScreenPhase = 'loading' | 'ready' | 'error';

type FeaturedShop = {
  cover_image: string;
  id: number;
  rating: number;
  shop_name: string;
  tags: string[];
  total_sales: number;
};

const HOME_CATEGORY_EMOJI: Record<string, string> = {
  蔬菜: '🥬',
  叶菜类: '🥬',
  根茎类: '🥕',
  猪肉: '🥩',
  肉类: '🥩',
  牛肉: '🥩',
  鱼类: '🐟',
  水产: '🐟',
  海鲜: '🦐',
  水果: '🍎',
  禽蛋: '🥚',
  蛋品: '🥚',
  冻品: '❄️',
  调料: '🧂',
  粮油: '🌾',
  其他: '🛍️',
};

function buildAddressLabel(addresses: UserAddress[]): string {
  if (addresses.length === 0) {
    return '选择收货地址';
  }

  const defaultAddress = addresses.find((item) => item.is_default === 1) ?? addresses[0];
  const value = [defaultAddress.province, defaultAddress.city, defaultAddress.district]
    .filter(Boolean)
    .join('');

  return value || '选择收货地址';
}

function normalizeHomeCategories(categories: CategoryTreeNode[]): CategoryTreeNode[] {
  if (categories.length === 0) {
    return [];
  }

  const picked = categories.slice(0, 8);
  if (picked.length >= 8) {
    return picked;
  }

  const existingNames = new Set(picked.map((item) => item.name));
  const fillers = ['水果', '禽蛋', '冻品', '调料', '粮油', '其他']
    .filter((name) => !existingNames.has(name))
    .map((name, index) => ({
      id: -(index + 1),
      parent_id: 0,
      name,
      icon: '',
      sort_order: 999 + index,
      status: 1,
      children: [],
    }));

  return [...picked, ...fillers].slice(0, 8);
}

function buildShopTags(shop: BuyerShopVO): string[] {
  const tags: string[] = [];

  if (shop.rating >= 4.8) {
    tags.push('品质保证');
  }
  if (shop.total_sales >= 500) {
    tags.push('月销领先');
  }
  if (tags.length === 0) {
    tags.push('新鲜直供');
  }
  if (tags.length === 1) {
    tags.push('准时送达');
  }

  return tags.slice(0, 2);
}

function pickFeaturedShops(products: BuyerProductItem[]): FeaturedShop[] {
  const unique = new Map<number, FeaturedShop>();

  for (const item of products) {
    if (unique.has(item.shop.id)) {
      continue;
    }

    unique.set(item.shop.id, {
      id: item.shop.id,
      shop_name: item.shop.shop_name,
      rating: item.shop.rating,
      total_sales: item.shop.total_sales,
      cover_image: item.shop.logo || item.cover_image,
      tags: buildShopTags(item.shop),
    });
  }

  return Array.from(unique.values()).slice(0, 3);
}

function CategoryTile({ category }: { category: CategoryTreeNode }) {
  const iconSource = resolveCategoryImageSource({
    icon: category.icon,
    name: category.name,
  });
  const emoji = HOME_CATEGORY_EMOJI[category.name] ?? '🛒';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (category.id <= 0) {
          router.push('/(tabs)/categories');
          return;
        }

        if (category.children?.length) {
          router.push(`/category/sub/${category.id}`);
          return;
        }

        router.push(`/category/${category.id}`);
      }}
      style={styles.categoryTile}
    >
      <View style={styles.categoryIconShell}>
        {iconSource ? (
          <Image source={iconSource} resizeMode="cover" style={styles.categoryIconImage} />
        ) : (
          <Text style={styles.categoryEmoji}>{emoji}</Text>
        )}
      </View>
      <Text numberOfLines={1} style={styles.categoryLabel}>
        {category.name}
      </Text>
    </Pressable>
  );
}

function RecommendedProductCard({ item }: { item: BuyerProductItem }) {
  const imageUri = resolveMediaUrl(item.cover_image);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/product/${item.id}`)}
      style={styles.productCard}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]} />
      )}
      <View style={styles.productBody}>
        <Text numberOfLines={1} style={styles.productName}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.productSubtitle}>
          {item.subtitle || item.shop.shop_name}
        </Text>
        <View style={styles.productPriceRow}>
          <Text style={styles.productPriceCurrency}>¥</Text>
          <Text style={styles.productPriceValue}>{item.price.toFixed(1)}</Text>
          <Text style={styles.productPriceUnit}>/{item.unit || '件'}</Text>
        </View>
        <Text numberOfLines={1} style={styles.productShopName}>
          {item.shop.shop_name}
        </Text>
      </View>
    </Pressable>
  );
}

function FeaturedShopCard({ shop }: { shop: FeaturedShop }) {
  const imageUri = resolveMediaUrl(shop.cover_image);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/shop/${shop.id}`)}
      style={styles.shopCard}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.shopImage} />
      ) : (
        <View style={[styles.shopImage, styles.shopImagePlaceholder]} />
      )}

      <View style={styles.shopBody}>
        <Text numberOfLines={1} style={styles.shopName}>
          {shop.shop_name}
        </Text>
        <View style={styles.shopMetaRow}>
          <Text style={styles.shopStar}>★</Text>
          <Text style={styles.shopMetaText}>{shop.rating.toFixed(1)}</Text>
          <Text style={styles.shopMetaText}>月销 {shop.total_sales}</Text>
        </View>
        <View style={styles.shopTagRow}>
          {shop.tags.map((tag) => (
            <View key={tag} style={styles.shopTag}>
              <Text style={styles.shopTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

export function BuyerHomeScreen() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [phase, setPhase] = useState<ScreenPhase>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [recommendProducts, setRecommendProducts] = useState<BuyerProductItem[]>([]);
  const [featuredShops, setFeaturedShops] = useState<FeaturedShop[]>([]);
  const [addressLabel, setAddressLabel] = useState('选择收货地址');

  const quickCategories = useMemo(() => normalizeHomeCategories(categories), [categories]);

  const load = useCallback(
    async (showLoading = true) => {
      try {
        setErrorMessage('');
        if (showLoading) {
          setPhase('loading');
        }

        const [categoryTree, productPage] = await Promise.all([
          fetchCategoryTree(),
          fetchBuyerProducts({ page: 1, page_size: 12, sort_by: 'sales_desc' }),
        ]);

        setCategories(categoryTree);
        setRecommendProducts(productPage.list.slice(0, 4));
        setFeaturedShops(pickFeaturedShops(productPage.list));

        if (accessToken) {
          const [addressResult] = await Promise.allSettled([fetchAddresses()]);
          if (addressResult.status === 'fulfilled') {
            setAddressLabel(buildAddressLabel(addressResult.value));
          } else {
            setAddressLabel('选择收货地址');
          }
        } else {
          setAddressLabel('选择收货地址');
        }

        setPhase('ready');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '加载首页失败');
        setPhase('error');
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load(false);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  if (phase === 'loading') {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (phase === 'error') {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage || '加载首页失败'} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/addresses')}
              style={styles.locationButton}
            >
              <Ionicons color="#FFFFFF" name="location-outline" size={16} />
              <Text numberOfLines={1} style={styles.locationText}>
                {addressLabel}
              </Text>
              <Ionicons color="#FFFFFF" name="chevron-forward" size={16} />
            </Pressable>
            <View style={styles.heroBadge}>
              <Ionicons color="#FFFFFF" name="flash" size={13} />
              <Text style={styles.heroBadgeText}>源头直供</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>今天采购什么新鲜货？</Text>
          <Text style={styles.heroSubtitle}>按分类补货，按店铺复购，帮你更快完成订货</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/search')}
            style={styles.searchBar}
          >
            <Ionicons color="#6B7280" name="search-outline" size={18} />
            <Text style={styles.searchText}>搜索商品、店铺</Text>
          </Pressable>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{quickCategories.length}</Text>
              <Text style={styles.heroStatLabel}>常用分类</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{recommendProducts.length}</Text>
              <Text style={styles.heroStatLabel}>今日推荐</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{featuredShops.length}</Text>
              <Text style={styles.heroStatLabel}>优质店铺</Text>
            </View>
          </View>
        </View>

        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            {quickCategories.map((category) => (
              <CategoryTile category={category} key={`${category.id}-${category.name}`} />
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日推荐</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/search')} style={styles.sectionActionWrap}>
              <Text style={styles.sectionAction}>更多</Text>
              <Ionicons color="#6B7280" name="chevron-forward" size={12} />
            </Pressable>
          </View>

          {recommendProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>暂无推荐商品</Text>
              <Text style={styles.emptyDescription}>稍后再来看看今日热销单品</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {recommendProducts.map((item) => (
                <RecommendedProductCard item={item} key={item.id} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>优质店铺</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/search')}
              style={styles.sectionActionWrap}
            >
              <Text style={styles.sectionAction}>更多</Text>
              <Ionicons color="#6B7280" name="chevron-forward" size={12} />
            </Pressable>
          </View>

          {featuredShops.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>暂无店铺推荐</Text>
              <Text style={styles.emptyDescription}>热销商家会优先展示在这里</Text>
            </View>
          ) : (
            <View style={styles.shopList}>
              {featuredShops.map((shop) => (
                <FeaturedShopCard key={shop.id} shop={shop} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: 92,
    backgroundColor: colors.background,
  },
  hero: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    ...elevation.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  locationText: {
    maxWidth: 190,
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
    color: '#FFFFFF',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '500',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.82)',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  searchBar: {
    marginTop: spacing.lg,
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  heroStatsRow: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  heroStatLabel: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.72)',
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categorySection: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTile: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  categoryIconShell: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryIconImage: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
  },
  categoryEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  categoryLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1A1A1A',
  },
  sectionCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  sectionActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionAction: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E5E9E5',
    overflow: 'hidden',
    ...elevation.sm,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E8EDE8',
  },
  productImagePlaceholder: {
    backgroundColor: '#E8EDE8',
  },
  productBody: {
    padding: spacing.md,
  },
  productName: {
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 2,
  },
  productSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  productPriceCurrency: {
    color: '#16A34A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  productPriceValue: {
    color: '#16A34A',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginLeft: 1,
  },
  productPriceUnit: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 2,
  },
  productShopName: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  shopList: {
    gap: spacing.md,
  },
  shopCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E5E9E5',
    ...elevation.sm,
  },
  shopImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E8EDE8',
  },
  shopImagePlaceholder: {
    backgroundColor: '#E8EDE8',
  },
  shopBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  shopName: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  shopStar: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18,
  },
  shopMetaText: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  shopTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shopTag: {
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  shopTagText: {
    color: '#16A34A',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  emptyCard: {
    minHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: '#E5E9E5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  emptyDescription: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
