import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { fetchBuyerProducts } from '@/api/catalog';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem } from '@/types/catalog';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

export default function CategoryProductsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const categoryId = Number(id);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [list, setList] = useState<BuyerProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'sales_desc' | 'price_asc' | 'price_desc'>('sales_desc');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        setErrorMessage('无效的分类');
        setPhase('error');
        return;
      }
      const pageData = await fetchBuyerProducts({
        category_id: categoryId,
        page: nextPage,
        page_size: 20,
        sort_by: sortBy,
      });
      if (append) {
        setList((prev) => [...prev, ...pageData.list]);
      } else {
        setList(pageData.list);
      }
      setPage(nextPage);
      setTotalPages(pageData.pagination.total_pages || 1);
    },
    [categoryId, sortBy],
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

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadPage(1, false);
    } catch {
      /* 保持列表 */
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const onEndReached = useCallback(async () => {
    if (phase !== 'ready' || loadingMore || page >= totalPages) {
      return;
    }
    try {
      setLoadingMore(true);
      await loadPage(page + 1, true);
    } catch {
      /* 忽略分页错误 */
    } finally {
      setLoadingMore(false);
    }
  }, [phase, loadingMore, page, totalPages, loadPage]);

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
        <ErrorRetryView message={errorMessage} onRetry={() => void initialLoad()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AppHeader
        title={name ? `${name}` : '分类商品'}
        subtitle="分类筛选 + 高密度商品列表"
        right={
          <Pressable style={styles.headerAction} onPress={() => router.push('/(tabs)/categories')}>
            <Text style={styles.headerActionText}>换分类</Text>
          </Pressable>
        }
      />
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, sortBy === 'sales_desc' && styles.filterChipActive]}
            onPress={() => setSortBy('sales_desc')}
          >
            <Text style={[styles.filterText, sortBy === 'sales_desc' && styles.filterTextActive]}>销量优先</Text>
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
        <Text style={styles.resultText}>当前共 {list.length} 件商品</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        onEndReachedThreshold={0.3}
        onEndReached={() => void onEndReached()}
        ListEmptyComponent={<EmptyState title="该分类下暂无商品" />}
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
    paddingBottom: spacing.xl,
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
  headerAction: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerActionText: {
    color: colors.warning,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
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
