import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { addCartItem } from '@/api/cart';
import { fetchBuyerProducts, fetchCategoryTree } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { BuyerProductItem, CategoryTreeNode } from '@/types/catalog';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

type Phase = 'loading' | 'ready' | 'error';

const PAGE_SIZE = 20;

function normalizeChildOptions(category: CategoryTreeNode | undefined): CategoryTreeNode[] {
  if (!category) {
    return [];
  }

  if (category.children?.length) {
    return category.children;
  }

  return [category];
}

export function BuyerCategoryScreen() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [productsPhase, setProductsPhase] = useState<Phase>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [productsError, setProductsError] = useState('');
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [activeParentId, setActiveParentId] = useState<number | null>(null);
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [products, setProducts] = useState<BuyerProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  const activeParent = useMemo(
    () => categories.find((item) => item.id === activeParentId) ?? categories[0],
    [activeParentId, categories],
  );
  const childOptions = useMemo(() => normalizeChildOptions(activeParent), [activeParent]);
  const activeChild = useMemo(
    () => childOptions.find((item) => item.id === activeChildId) ?? childOptions[0] ?? null,
    [activeChildId, childOptions],
  );

  const loadCategories = useCallback(
    async (showLoading = true, preferredParentId: number | null = null, preferredChildId: number | null = null) => {
      try {
        setErrorMessage('');
        if (showLoading) {
          setPhase('loading');
        }

        const tree = await fetchCategoryTree();
        const nextParent = tree.find((item) => item.id === preferredParentId) ?? tree[0];
        const nextChildren = normalizeChildOptions(nextParent);
        const nextChild =
          nextChildren.find((item) => item.id === preferredChildId) ?? nextChildren[0] ?? null;

        setCategories(tree);
        setActiveParentId(nextParent?.id ?? null);
        setActiveChildId(nextChild?.id ?? null);
        setPhase('ready');

        return nextChild?.id ?? null;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '分类加载失败');
        setPhase('error');
        return null;
      }
    },
    [],
  );

  const loadProducts = useCallback(async (categoryId: number, nextPage = 1, append = false, showLoading = true) => {
    try {
      setProductsError('');
      if (showLoading) {
        setProductsPhase('loading');
      }

      const pageData = await fetchBuyerProducts({
        category_id: categoryId,
        page: nextPage,
        page_size: PAGE_SIZE,
      });

      setProducts((prev) => (append ? [...prev, ...pageData.list] : pageData.list));
      setPage(nextPage);
      setTotalPages(pageData.pagination.total_pages || 1);
      setProductsPhase('ready');
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : '商品加载失败');
      if (append) {
        setProductsPhase('ready');
      } else {
        setProductsPhase('error');
        setProducts([]);
        setPage(1);
        setTotalPages(1);
      }
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!activeParent) {
      return;
    }

    const options = normalizeChildOptions(activeParent);
    setActiveChildId((prev) => {
      if (prev && options.some((item) => item.id === prev)) {
        return prev;
      }
      return options[0]?.id ?? null;
    });
  }, [activeParent]);

  useEffect(() => {
    if (!activeChildId) {
      setProducts([]);
      setPage(1);
      setTotalPages(1);
      setProductsPhase('ready');
      return;
    }

    void loadProducts(activeChildId, 1, false, true);
  }, [activeChildId, loadProducts]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const nextChildId = await loadCategories(false, activeParentId, activeChildId);
      if (nextChildId) {
        await loadProducts(nextChildId, 1, false, false);
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeChildId, activeParentId, loadCategories, loadProducts]);

  const onEndReached = useCallback(async () => {
    if (!activeChildId || productsPhase !== 'ready' || loadingMore || page >= totalPages) {
      return;
    }

    try {
      setLoadingMore(true);
      await loadProducts(activeChildId, page + 1, true, false);
    } finally {
      setLoadingMore(false);
    }
  }, [activeChildId, loadingMore, loadProducts, page, productsPhase, totalPages]);

  const onAddToCart = useCallback(async (item: BuyerProductItem) => {
    if (!item.can_buy) {
      Alert.alert('提示', '当前商品暂不可购买');
      return;
    }

    try {
      setAddingProductId(item.id);
      await addCartItem({ product_id: item.id, quantity: item.min_buy > 0 ? item.min_buy : 1 });
      Alert.alert('成功', '已加入购物车');
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setAddingProductId(null);
    }
  }, []);

  const renderProductEmpty = useCallback(() => {
    if (productsPhase === 'loading') {
      return <LoadingView message="正在加载商品" />;
    }

    if (productsPhase === 'error') {
      return (
        <ErrorRetryView
          message={productsError || '商品加载失败'}
          onRetry={() => {
            if (!activeChildId) {
              return;
            }
            void loadProducts(activeChildId, 1, false, true);
          }}
        />
      );
    }

    return (
      <EmptyState
        title="暂无商品"
        description={activeChild ? `${activeChild.name} 下还没有可售商品` : '当前分类下还没有可售商品'}
      />
    );
  }, [activeChild, activeChildId, loadProducts, productsError, productsPhase]);

  const renderProductRow = useCallback(
    (item: BuyerProductItem) => {
      const imageUri = resolveMediaUrl(item.cover_image);
      const unitLabel = item.unit || '斤';
      const priceText = Number.isFinite(item.price) ? item.price.toFixed(1) : '--';
      const adding = addingProductId === item.id;

      return (
        <Pressable
          accessibilityRole="button"
          key={item.id}
          onPress={() => router.push(`/product/${item.id}`)}
          style={styles.productCard}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.productCover} />
          ) : (
            <View style={[styles.productCover, styles.productCoverPlaceholder]} />
          )}

          <View style={styles.productBody}>
            <Text numberOfLines={1} style={styles.productName}>
              {item.name}
            </Text>
            <Text numberOfLines={1} style={styles.productSubtitle}>
              {item.subtitle || '源头直采 现货供应'}
            </Text>
            <Text style={styles.productSales}>月销 {item.shop.total_sales}</Text>

            <View style={styles.productBottomRow}>
              <Text style={styles.productPrice}>
                ￥{priceText}
                <Text style={styles.productUnit}>/{unitLabel}</Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={adding || !item.can_buy}
                onPress={() => void onAddToCart(item)}
                style={[styles.addButton, (!item.can_buy || adding) && styles.addButtonDisabled]}
              >
                <Text style={styles.addButtonText}>{adding ? '加入中' : '加入购物车'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      );
    },
    [addingProductId, onAddToCart],
  );

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
        <ErrorRetryView message={errorMessage || '分类加载失败'} onRetry={() => void loadCategories()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={22} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/search')} style={styles.searchBar}>
          <Ionicons color="#9AA39E" name="search-outline" size={18} />
          <Text style={styles.searchText}>搜索商品</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <ScrollView contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false} style={styles.leftPanel}>
          {categories.map((item) => {
            const active = item.id === activeParent?.id;
            return (
              <Pressable
                accessibilityRole="button"
                key={item.id}
                onPress={() => setActiveParentId(item.id)}
                style={[styles.leftItem, active && styles.leftItemActive]}
              >
                {active ? <View style={styles.leftIndicator} /> : null}
                <Text numberOfLines={1} style={[styles.leftItemText, active && styles.leftItemTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.rightPanel}>
          <FlatList
            contentContainerStyle={styles.productContent}
            data={products}
            extraData={productsPhase}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={renderProductEmpty}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator color="#18A84A" />
                </View>
              ) : (
                <View style={styles.footerSpace} />
              )
            }
            ListHeaderComponent={
              <View style={styles.rightHeader}>
                <View style={styles.tagsContent}>
                  {childOptions.map((item) => {
                    const active = item.id === activeChild?.id;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={item.id}
                        onPress={() => setActiveChildId(item.id)}
                        style={[styles.tag, active && styles.tagActive]}
                      >
                        <Text style={[styles.tagText, active && styles.tagTextActive]}>{item.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            }
            onEndReachedThreshold={0.25}
            onEndReached={() => void onEndReached()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
            renderItem={({ item }) => renderProductRow(item)}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#F5F7F5',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EBE8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAEFED',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9AA39E',
  },
  panel: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EFF2F0',
  },
  leftPanel: {
    width: 82,
    backgroundColor: '#E7ECE8',
    borderRightWidth: 1,
    borderRightColor: '#DDE3DE',
  },
  leftContent: {
    paddingVertical: spacing.xs,
  },
  leftItem: {
    minHeight: 56,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    justifyContent: 'center',
    backgroundColor: '#E7ECE8',
  },
  leftItemActive: {
    backgroundColor: '#F6FAF7',
  },
  leftIndicator: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 3,
    borderTopRightRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
    backgroundColor: '#1FB05A',
  },
  leftItemText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#101812',
    fontWeight: '600',
  },
  leftItemTextActive: {
    color: '#15A24D',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#F4F6F4',
  },
  rightHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: '#F4F6F4',
  },
  tagsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  tag: {
    minHeight: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E5E9E6',
    backgroundColor: '#ECEFEC',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagActive: {
    borderColor: '#D5E8DA',
    backgroundColor: '#DFF3E6',
  },
  tagText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#141B16',
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#0E9A47',
  },
  productContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  productCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBE2DC',
    backgroundColor: '#F7F9F7',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  productCover: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#DDE4DE',
  },
  productCoverPlaceholder: {
    backgroundColor: '#DDE4DE',
  },
  productBody: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  productName: {
    fontSize: 16,
    lineHeight: 22,
    color: '#101812',
    fontWeight: '700',
  },
  productSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#5E6E63',
  },
  productSales: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#4F6155',
  },
  productBottomRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  productPrice: {
    flex: 1,
    fontSize: 28,
    lineHeight: 30,
    color: '#0EA14B',
    fontWeight: '700',
  },
  productUnit: {
    fontSize: 16,
    lineHeight: 18,
    color: '#1C2A22',
    fontWeight: '600',
  },
  addButton: {
    minWidth: 62,
    borderRadius: 10,
    backgroundColor: '#14A94D',
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 14,
    lineHeight: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpace: {
    height: spacing.md,
  },
});
