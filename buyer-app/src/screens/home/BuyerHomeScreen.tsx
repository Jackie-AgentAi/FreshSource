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
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import type { UserAddress } from '@/types/address';
import type { BuyerProductItem, CategoryTreeNode } from '@/types/catalog';
import { resolveMediaUrl } from '@/utils/media';

type ScreenPhase = 'loading' | 'ready' | 'error';

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

function normalizeQuickCategories(categories: CategoryTreeNode[]): CategoryTreeNode[] {
  if (categories.length === 0) {
    return [];
  }

  const picked = categories.slice(0, 4);
  if (picked.length === 4) {
    return picked;
  }

  const names = new Set(picked.map((item) => item.name));
  if (!names.has('其他')) {
    picked.push({
      id: -1,
      parent_id: 0,
      name: '其他',
      icon: '',
      sort_order: 999,
      status: 1,
      children: [],
    });
  }

  return picked.slice(0, 4);
}

function RecommendationCard({ item }: { item: BuyerProductItem }) {
  const imageUri = resolveMediaUrl(item.cover_image);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/product/${item.id}`)}
      style={styles.recommendationCard}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} resizeMode="cover" style={styles.recommendationImage} />
      ) : (
        <View style={[styles.recommendationImage, styles.recommendationImagePlaceholder]} />
      )}
      <View style={styles.recommendationBody}>
        <Text numberOfLines={1} style={styles.recommendationName}>
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.recommendationMeta}>
          {item.subtitle || item.shop.shop_name}
        </Text>
        <Text style={styles.recommendationPrice}>
          ¥{item.price.toFixed(1)}
          <Text style={styles.recommendationUnit}>/{item.unit || '件'}</Text>
        </Text>
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
  const [addressLabel, setAddressLabel] = useState('选择收货地址');

  const quickCategories = useMemo(() => normalizeQuickCategories(categories), [categories]);

  const load = useCallback(
    async (showLoading = true) => {
      try {
        setErrorMessage('');
        if (showLoading) {
          setPhase('loading');
        }

        const [categoryTree, recommendPage] = await Promise.all([
          fetchCategoryTree(),
          fetchBuyerProducts({ page: 1, page_size: 4, sort_by: 'sales_desc' }),
        ]);

        setCategories(categoryTree);
        setRecommendProducts(recommendPage.list.slice(0, 2));

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
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/addresses')}
            style={styles.locationRow}
          >
            <Ionicons color={colors.surface} name="location-outline" size={20} />
            <Text numberOfLines={1} style={styles.locationText}>
              {addressLabel}
            </Text>
            <Ionicons color={colors.surface} name="chevron-forward" size={18} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/search')}
            style={styles.searchBar}
          >
            <Ionicons color="#A0A6B2" name="search-outline" size={20} />
            <Text style={styles.searchText}>搜索商品、店铺</Text>
          </Pressable>
        </View>

        <View style={styles.categorySection}>
          {quickCategories.map((category) => {
            const iconSource = resolveCategoryImageSource({
              icon: category.icon,
              name: category.name,
            });

            return (
              <Pressable
                accessibilityRole="button"
                key={`${category.id}-${category.name}`}
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
                style={styles.categoryItem}
              >
                <View style={styles.categoryIconWrap}>
                  {iconSource ? (
                    <Image source={iconSource} resizeMode="cover" style={styles.categoryIconImage} />
                  ) : (
                    <Ionicons
                      color={category.name === '其他' ? colors.textMuted : colors.primaryGlow}
                      name="storefront-outline"
                      size={26}
                    />
                  )}
                </View>
                <Text style={styles.categoryLabel}>{category.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.recommendSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日推荐</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/search')}>
              <Text style={styles.sectionAction}>更多</Text>
            </Pressable>
          </View>

          {recommendProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons color="#A5AAB6" name="remove-outline" size={28} />
              </View>
              <Text style={styles.emptyTitle}>暂无推荐商品</Text>
              <Text style={styles.emptyDesc}>稍后再来看看今日推荐吧</Text>
            </View>
          ) : (
            <View style={styles.recommendationList}>
              {recommendProducts.map((item) => (
                <RecommendationCard item={item} key={item.id} />
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
    paddingBottom: 48,
    backgroundColor: '#F2F5F2',
  },
  hero: {
    backgroundColor: '#18A84A',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.surface,
    fontWeight: '700',
  },
  searchBar: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchText: {
    marginLeft: spacing.sm,
    color: '#A0A6B2',
    fontSize: typography.body,
    lineHeight: lineHeight.body,
  },
  categorySection: {
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '24%',
    alignItems: 'center',
  },
  categoryIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F2F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryIconImage: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
  },
  categoryLabel: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textStrong,
  },
  recommendSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.textStrong,
    fontWeight: '800',
  },
  sectionAction: {
    color: '#9AA0AA',
    fontSize: typography.body,
    lineHeight: lineHeight.body,
  },
  emptyCard: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E7ECE6',
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.round,
    backgroundColor: '#F6F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textStrong,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    fontWeight: '700',
  },
  emptyDesc: {
    marginTop: spacing.xs,
    color: '#9AA0AA',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  recommendationList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  recommendationCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E7ECE6',
    overflow: 'hidden',
    ...elevation.sm,
  },
  recommendationImage: {
    width: '100%',
    aspectRatio: 1.6,
    backgroundColor: '#EEF1ED',
  },
  recommendationImagePlaceholder: {
    backgroundColor: '#EEF1ED',
  },
  recommendationBody: {
    padding: spacing.md,
  },
  recommendationName: {
    color: colors.textStrong,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    fontWeight: '700',
  },
  recommendationMeta: {
    marginTop: spacing.xs,
    color: '#7B8597',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  recommendationPrice: {
    marginTop: spacing.sm,
    color: '#18A84A',
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '800',
  },
  recommendationUnit: {
    color: '#7B8597',
    fontWeight: '400',
  },
});
