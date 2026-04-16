import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { fetchBuyerProducts, fetchCategoryTree } from '@/api/catalog';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem, CategoryTreeNode } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

type LoadState = 'loading' | 'ready' | 'error';

export default function HomePage() {
  const navigation = useNavigation();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [products, setProducts] = useState<BuyerProductItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const quickCategories = useMemo(() => categories.slice(0, 8), [categories]);
  const hotProducts = useMemo(() => products.slice(0, 8), [products]);

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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
      <AppHeader
        title="你好，欢迎回来"
        subtitle="今日推荐与采购快捷入口"
        right={
          <Pressable style={styles.headerAction} onPress={() => router.push('/(tabs)/cart')}>
            <Text style={styles.headerActionText}>购物车</Text>
          </Pressable>
        }
      />
      <View style={styles.header}>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          accessibilityRole="button"
          accessibilityLabel="搜索商品"
        >
          <Text style={styles.searchPlaceholder}>搜索商品、品牌、货号</Text>
        </Pressable>
      </View>

      <FlatList
        data={hotProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>VIP Member</Text>
              <Text style={styles.heroTitle}>品质优选 · 今日上新</Text>
              <Text style={styles.heroDesc}>高复购商品优先展示，支持一键下单与快速补货。</Text>
              <View style={styles.heroStats}>
                <View>
                  <Text style={styles.heroStatValue}>68</Text>
                  <Text style={styles.heroStatLabel}>进行订单</Text>
                </View>
                <View>
                  <Text style={styles.heroStatValue}>¥320</Text>
                  <Text style={styles.heroStatLabel}>可用优惠</Text>
                </View>
              </View>
              <View style={styles.heroCtas}>
                <Pressable style={styles.heroPrimaryBtn} onPress={() => router.push('/search')}>
                  <Text style={styles.heroPrimaryBtnText}>去搜索</Text>
                </Pressable>
                <Pressable style={styles.heroGhostBtn} onPress={() => router.push('/(tabs)/categories')}>
                  <Text style={styles.heroGhostBtnText}>看分类</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>分类快捷入口</Text>
              <Pressable onPress={() => router.push('/(tabs)/categories')}>
                <Text style={styles.sectionLink}>全部分类</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {quickCategories.map((c) => (
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
            </ScrollView>

            <View style={[styles.sectionRow, styles.sectionTitleSpaced]}>
              <Text style={styles.sectionTitle}>热门商品</Text>
              <Pressable onPress={() => router.push('/search')}>
                <Text style={styles.sectionLink}>更多</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title="暂无推荐商品" description="请稍后再试或去分类里逛逛" />}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerAction: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  headerActionText: {
    color: colors.warning,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  listHeader: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    padding: spacing.lg,
    marginHorizontal: spacing.sm,
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
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: colors.surface,
    fontWeight: '800',
  },
  heroDesc: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  heroStats: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.xl,
  },
  heroStatValue: {
    color: colors.accent,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: typography.micro,
    lineHeight: lineHeight.micro,
  },
  heroCtas: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroPrimaryBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  heroPrimaryBtnText: {
    color: colors.primaryPressed,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '800',
  },
  heroGhostBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  heroGhostBtnText: {
    color: colors.surface,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
  sectionRow: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    fontWeight: '800',
    color: colors.textStrong,
  },
  sectionLink: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionTitleSpaced: {
    marginTop: spacing.md,
  },
  catScroll: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  catChip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  catChipText: {
    color: colors.primary,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
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
