import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { fetchShopHomepage } from '@/api/catalog';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem, BuyerShopVO } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

export default function ShopHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const shopId = Number(id);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [shop, setShop] = useState<BuyerShopVO | null>(null);
  const [list, setList] = useState<BuyerProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!Number.isFinite(shopId) || shopId <= 0) {
        setErrorMessage('无效的店铺');
        setPhase('error');
        return;
      }
      const data = await fetchShopHomepage(shopId, nextPage, pageSize);
      setShop(data.shop);
      if (append) {
        setList((prev) => [...prev, ...data.products]);
      } else {
        setList(data.products);
      }
      setPage(nextPage);
      setTotal(data.pagination.total);
    },
    [shopId, pageSize],
  );

  const initialLoad = useCallback(async () => {
    try {
      setPhase('loading');
      setErrorMessage('');
      await loadPage(1, false);
      setPhase('ready');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : '加载失败');
      setPhase('error');
    }
  }, [loadPage]);

  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadPage(1, false);
    } catch {
      /* 保留旧数据 */
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const onEndReached = useCallback(async () => {
    if (phase !== 'ready' || loadingMore || list.length >= total) {
      return;
    }
    try {
      setLoadingMore(true);
      await loadPage(page + 1, true);
    } catch {
      /* 忽略 */
    } finally {
      setLoadingMore(false);
    }
  }, [phase, loadingMore, list.length, total, page, loadPage]);

  if (phase === 'loading') {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (phase === 'error' || !shop) {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage} onRetry={() => void initialLoad()} />
      </PageContainer>
    );
  }

  const logoUri = resolveMediaUrl(shop.logo);
  const displayList = useMemo(() => {
    if (sortBy === 'default') {
      return list;
    }
    const copied = [...list];
    copied.sort((a, b) => {
      const ap = Number(a.price ?? 0);
      const bp = Number(b.price ?? 0);
      return sortBy === 'price_asc' ? ap - bp : bp - ap;
    });
    return copied;
  }, [list, sortBy]);

  return (
    <PageContainer>
      <AppHeader
        title={shop.shop_name}
        subtitle={`评分 ${shop.rating?.toFixed?.(1) ?? shop.rating} · 已售 ${shop.total_sales}`}
      />
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, sortBy === 'default' && styles.filterChipActive]}
            onPress={() => setSortBy('default')}
          >
            <Text style={[styles.filterText, sortBy === 'default' && styles.filterTextActive]}>综合推荐</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, sortBy === 'price_asc' && styles.filterChipActive]}
            onPress={() => setSortBy('price_asc')}
          >
            <Text style={[styles.filterText, sortBy === 'price_asc' && styles.filterTextActive]}>价格升序</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, sortBy === 'price_desc' && styles.filterChipActive]}
            onPress={() => setSortBy('price_desc')}
          >
            <Text style={[styles.filterText, sortBy === 'price_desc' && styles.filterTextActive]}>价格降序</Text>
          </Pressable>
        </View>
        <Text style={styles.resultText}>店铺共 {total} 件商品</Text>
      </View>
      <FlatList
        data={displayList}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        onEndReachedThreshold={0.3}
        onEndReached={() => void onEndReached()}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>SHOP PROFILE</Text>
              <Text style={styles.heroTitle}>{shop.shop_name}</Text>
              <Text style={styles.heroStat}>评分 {shop.rating?.toFixed?.(1) ?? shop.rating} · 已售 {shop.total_sales}</Text>
            </View>
            <View style={styles.shopRow}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="cover" />
              ) : (
                <View style={[styles.logo, styles.logoPh]} />
              )}
              <View style={styles.shopText}>
                <Text style={styles.shopTitle}>{shop.shop_name}</Text>
                {shop.description ? (
                  <Text style={styles.shopDesc} numberOfLines={3}>
                    {shop.description}
                  </Text>
                ) : null}
                <Text style={styles.shopMeta}>
                  联系电话 {shop.contact_phone || '-'}
                </Text>
                <Text style={styles.shopMeta}>在售商品 {total} 件</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title="店内暂无商品" />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardCell}>
            <ProductCard
              item={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onAddToCart={() => router.push('/(tabs)/cart')}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  toolbar: {
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryGlow,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.primaryPressed,
    fontWeight: '800',
  },
  resultText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...elevation.sm,
  },
  heroLabel: {
    color: colors.accent,
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    fontWeight: '800',
  },
  heroStat: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    marginTop: spacing.xs,
  },
  shopCard: {
    backgroundColor: colors.surfaceSecondary,
  },
  shopRow: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...elevation.sm,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  logoPh: {
    backgroundColor: colors.border,
  },
  shopText: {
    flex: 1,
  },
  shopTitle: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    fontWeight: '700',
    color: colors.textStrong,
  },
  shopDesc: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  shopMeta: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
  },
  columnWrap: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  cardCell: {
    flex: 1,
    maxWidth: '50%',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
