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

function CategoryProductCard({
  adding,
  item,
  onAddToCart,
}: {
  adding: boolean;
  item: BuyerProductItem;
  onAddToCart: (item: BuyerProductItem) => void;
}) {
  const imageUri = resolveMediaUrl(item.cover_image);
  const unitLabel = item.unit || '斤';
  const priceText = Number.isFinite(item.price) ? item.price.toFixed(1) : '--';

  return (
    <Pressable
      accessibilityRole="button"
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
          {item.subtitle || item.shop.shop_name}
        </Text>
        <Text numberOfLines={1} style={styles.productSales}>
          月销 {item.shop.total_sales}
        </Text>

        <View style={styles.productBottomRow}>
          <View style={styles.productPriceWrap}>
            <Text style={styles.productCurrency}>¥</Text>
            <Text style={styles.productPrice}>{priceText}</Text>
            <Text style={styles.productUnit}>/{unitLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={adding || !item.can_buy}
            onPress={() => onAddToCart(item)}
            style={[styles.addButton, (!item.can_buy || adding) && styles.addButtonDisabled]}
          >
            <Text style={styles.addButtonText}>{adding ? '加入中' : '加入购物车'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
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
    async (
      showLoading = true,
      preferredParentId: number | null = null,
      preferredChildId: number | null = null,
    ) => {
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

  const loadProducts = useCallback(
    async (categoryId: number, nextPage = 1, append = false, showLoading = true) => {
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
    },
    [],
  );

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
    <PageContainer contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>分类采购</Text>
            <Text style={styles.headerSubtitle}>快速筛选常用食材，直接加入购物车</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons color={colors.primary} name="leaf-outline" size={14} />
            <Text style={styles.headerBadgeText}>新鲜到货</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/search')} style={styles.searchBar}>
          <Ionicons color="#6B7280" name="search-outline" size={18} />
          <Text style={styles.searchText}>搜索商品</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <View style={styles.leftPanel}>
          <FlatList
            contentContainerStyle={styles.leftContent}
            data={categories}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const active = item.id === activeParent?.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveParentId(item.id)}
                  style={[styles.leftItem, active && styles.leftItemActive]}
                >
                  <View style={[styles.leftIndicator, active && styles.leftIndicatorActive]} />
                  <Text numberOfLines={1} style={[styles.leftItemText, active && styles.leftItemTextActive]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={styles.rightPanel}>
          <FlatList
            contentContainerStyle={styles.productContent}
            data={products}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={renderProductEmpty}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator color="#16A34A" />
                </View>
              ) : (
                <View style={styles.footerSpace} />
              )
            }
            ListHeaderComponent={
              <View style={styles.rightHeader}>
                <View style={styles.tagRow}>
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
            onEndReached={() => void onEndReached()}
            onEndReachedThreshold={0.25}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
            renderItem={({ item }) => (
              <CategoryProductCard
                adding={addingProductId === item.id}
                item={item}
                onAddToCart={(product) => void onAddToCart(product)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    color: colors.textStrong,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerBadgeText: {
    color: colors.primary,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  searchBar: {
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
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
  panel: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  leftPanel: {
    width: 104,
    backgroundColor: colors.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  leftContent: {
    paddingVertical: spacing.xs,
  },
  leftItem: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  leftItemActive: {
    backgroundColor: colors.surface,
  },
  leftIndicator: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 3,
    borderTopRightRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  leftIndicatorActive: {
    backgroundColor: colors.primary,
  },
  leftItemText: {
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  leftItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rightHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tagText: {
    color: '#1A1A1A',
    fontSize: 13,
    lineHeight: 18,
  },
  tagTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  productContent: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  productCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  productCover: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: '#E8EDE8',
  },
  productCoverPlaceholder: {
    backgroundColor: '#E8EDE8',
  },
  productBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  productName: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  productSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  productSales: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  productBottomRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  productPriceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  productCurrency: {
    color: '#16A34A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  productPrice: {
    color: '#16A34A',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    marginLeft: 1,
  },
  productUnit: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 2,
  },
  addButton: {
    minWidth: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
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
