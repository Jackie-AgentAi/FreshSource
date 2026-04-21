import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchShopHomepage } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem, BuyerShopVO } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type SortMode = 'default' | 'price_asc' | 'price_desc';

export function BuyerShopHomeScreen() {
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
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!Number.isFinite(shopId) || shopId <= 0) {
        setErrorMessage('无效的店铺');
        setPhase('error');
        return;
      }

      const result = await fetchShopHomepage(shopId, nextPage, pageSize);
      setShop(result.shop);
      setPage(nextPage);
      setTotal(result.pagination.total);
      setList((prev) => (append ? [...prev, ...result.products] : result.products));
    },
    [pageSize, shopId],
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
    } finally {
      setLoadingMore(false);
    }
  }, [list.length, loadPage, loadingMore, page, phase, total]);

  const displayList = useMemo(() => {
    if (sortMode === 'default') {
      return list;
    }
    const copied = [...list];
    copied.sort((left, right) => {
      const leftPrice = Number(left.price ?? 0);
      const rightPrice = Number(right.price ?? 0);
      return sortMode === 'price_asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
    });
    return copied;
  }, [list, sortMode]);

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

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={26} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          店铺主页
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/search')} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="search-outline" size={22} />
        </Pressable>
      </View>

      <FlatList
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.listContent}
        data={displayList}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EmptyState title="店内暂无商品" />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primaryGlow} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                {logoUri ? (
                  <Image resizeMode="cover" source={{ uri: logoUri }} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, styles.logoPlaceholder]} />
                )}
                <View style={styles.heroBody}>
                  <Text style={styles.heroEyebrow}>SHOP PROFILE</Text>
                  <Text style={styles.heroTitle}>{shop.shop_name}</Text>
                  <Text style={styles.heroMeta}>
                    评分 {shop.rating?.toFixed?.(1) ?? shop.rating} · 已售 {shop.total_sales}
                  </Text>
                </View>
              </View>
              {shop.description ? (
                <Text numberOfLines={3} style={styles.heroDesc}>
                  {shop.description}
                </Text>
              ) : null}
              <View style={styles.infoGrid}>
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipLabel}>联系电话</Text>
                  <Text numberOfLines={1} style={styles.infoChipValue}>
                    {shop.contact_phone || '-'}
                  </Text>
                </View>
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipLabel}>在售商品</Text>
                  <Text style={styles.infoChipValue}>{total} 件</Text>
                </View>
              </View>
            </View>

            <View style={styles.filterRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSortMode('default')}
                style={[styles.filterChip, sortMode === 'default' && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, sortMode === 'default' && styles.filterTextActive]}>
                  综合推荐
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSortMode('price_asc')}
                style={[styles.filterChip, sortMode === 'price_asc' && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, sortMode === 'price_asc' && styles.filterTextActive]}>
                  价格升序
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSortMode('price_desc')}
                style={[styles.filterChip, sortMode === 'price_desc' && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, sortMode === 'price_desc' && styles.filterTextActive]}>
                  价格降序
                </Text>
              </Pressable>
            </View>
          </>
        }
        numColumns={2}
        onEndReached={() => void onEndReached()}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl onRefresh={() => void onRefresh()} refreshing={refreshing} />}
        renderItem={({ item }) => (
          <View style={styles.cardCell}>
            <ProductCard
              item={item}
              onAddToCart={() => router.push('/(tabs)/cart')}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: colors.textStrong,
    fontWeight: '800',
  },
  listContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: '#18A84A',
    padding: spacing.lg,
    ...elevation.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logoPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBody: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#D8F5E2',
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: spacing.xs,
    color: colors.surface,
    fontSize: typography.h3,
    lineHeight: lineHeight.h3,
    fontWeight: '800',
  },
  heroMeta: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.82)',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  heroDesc: {
    marginTop: spacing.md,
    color: 'rgba(255,255,255,0.88)',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  infoChip: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  infoChipLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  infoChipValue: {
    marginTop: spacing.xs,
    color: colors.surface,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    borderColor: '#9FDAB2',
    backgroundColor: '#EAF7EE',
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#18A84A',
    fontWeight: '800',
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
