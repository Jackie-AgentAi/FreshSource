import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { fetchShopHomepage } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem, BuyerShopVO } from '@/types/catalog';
import { colors, radius, spacing, typography } from '@/theme/tokens';
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
    if (shop?.shop_name) {
      navigation.setOptions({ title: shop.shop_name });
    }
  }, [navigation, shop?.shop_name]);

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

  return (
    <PageContainer>
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        onEndReachedThreshold={0.3}
        onEndReached={() => void onEndReached()}
        ListHeaderComponent={
          <View style={styles.header}>
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
                  评分 {shop.rating?.toFixed?.(1) ?? shop.rating} · 累计销量 {shop.total_sales}
                </Text>
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
            <ProductCard item={item} onPress={() => router.push(`/product/${item.id}`)} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  shopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  logoPh: {
    backgroundColor: '#ddd',
  },
  shopText: {
    flex: 1,
  },
  shopTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  shopDesc: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  shopMeta: {
    marginTop: spacing.sm,
    fontSize: typography.small,
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
