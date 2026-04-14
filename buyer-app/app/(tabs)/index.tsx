import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchBuyerProducts, fetchCategoryTree } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem, CategoryTreeNode } from '@/types/catalog';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type LoadState = 'loading' | 'ready' | 'error';

export default function HomePage() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [products, setProducts] = useState<BuyerProductItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadState('loading');
      setErrorMessage('');
      const [tree, productPage] = await Promise.all([
        fetchCategoryTree(),
        fetchBuyerProducts({ page: 1, page_size: 10, sort_by: 'sales_desc' }),
      ]);
      setCategories(tree);
      setProducts(productPage.list);
      setLoadState('ready');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : '加载失败');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const [tree, productPage] = await Promise.all([
        fetchCategoryTree(),
        fetchBuyerProducts({ page: 1, page_size: 10, sort_by: 'sales_desc' }),
      ]);
      setCategories(tree);
      setProducts(productPage.list);
    } catch {
      /* 下拉刷新失败时保留旧数据，避免白屏 */
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loadState === 'loading') {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (loadState === 'error') {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage || '加载失败'} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          accessibilityRole="button"
          accessibilityLabel="搜索商品"
        >
          <Text style={styles.searchPlaceholder}>搜索商品</Text>
        </Pressable>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>分类</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.catChip}
                  onPress={() => {
                    if (c.children?.length) {
                      router.push(`/category/sub/${c.id}`);
                    } else {
                      router.push(`/category/${c.id}`);
                    }
                  }}
                >
                  <Text style={styles.catChipText}>{c.name}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.catChipOutline}
                onPress={() => router.push('/(tabs)/categories')}
              >
                <Text style={styles.catChipOutlineText}>全部分类</Text>
              </Pressable>
            </ScrollView>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>推荐</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState title="暂无推荐商品" description="请稍后再试或去分类里逛逛" />}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchBar: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  listHeader: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: spacing.lg,
  },
  catScroll: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  catChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  catChipText: {
    color: colors.surface,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  catChipOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  catChipOutlineText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  columnWrap: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  cardCell: {
    flex: 1,
    maxWidth: '50%',
  },
});
