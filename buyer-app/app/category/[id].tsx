import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { fetchBuyerProducts } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem } from '@/types/catalog';
import { colors, spacing } from '@/theme/tokens';

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  useLayoutEffect(() => {
    navigation.setOptions({ title: '分类商品' });
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
      });
      if (append) {
        setList((prev) => [...prev, ...pageData.list]);
      } else {
        setList(pageData.list);
      }
      setPage(nextPage);
      setTotalPages(pageData.pagination.total_pages || 1);
    },
    [categoryId],
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
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
