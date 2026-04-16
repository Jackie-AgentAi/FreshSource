import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { fetchCategoryTree } from '@/api/catalog';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { CategoryTreeNode } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

export default function CategoriesTabPage() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [activeParentId, setActiveParentId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activeParent = useMemo(
    () => tree.find((item) => item.id === activeParentId) ?? tree[0],
    [activeParentId, tree],
  );

  const rightPanelNodes = useMemo(() => {
    if (!activeParent) {
      return [];
    }
    if (activeParent.children?.length) {
      return activeParent.children;
    }
    return [activeParent];
  }, [activeParent]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const categoryTree = await fetchCategoryTree();
      setTree(categoryTree);
      setActiveParentId((prev) => prev ?? categoryTree[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
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
      const categoryTree = await fetchCategoryTree();
      setTree(categoryTree);
      setActiveParentId((prev) => {
        if (!prev) {
          return categoryTree[0]?.id ?? null;
        }
        const stillExists = categoryTree.some((item) => item.id === prev);
        return stillExists ? prev : (categoryTree[0]?.id ?? null);
      });
    } catch {
      /* 保留旧数据 */
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openCategory = (node: CategoryTreeNode) => {
    if (node.children?.length) {
      router.push(`/category/sub/${node.id}`);
      return;
    }
    router.push({
      pathname: '/category/[id]',
      params: { id: String(node.id), name: node.name },
    });
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorRetryView message={error} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AppHeader title="商品列表" subtitle="分类筛选与高密度选品" />
      {tree.length === 0 ? (
        <EmptyState title="暂无分类" />
      ) : (
        <View style={styles.panel}>
          <FlatList
            data={tree}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
            style={styles.leftColumn}
            contentContainerStyle={styles.leftContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = item.id === activeParent?.id;
              return (
                <Pressable
                  style={[styles.leftItem, active && styles.leftItemActive]}
                  onPress={() => setActiveParentId(item.id)}
                >
                  <Text style={[styles.leftItemText, active && styles.leftItemTextActive]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />

          <ScrollView
            style={styles.rightColumn}
            contentContainerStyle={styles.rightContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Category Hub</Text>
              <Text style={styles.heroTitle}>精选品类 · 快速下单</Text>
              <Text style={styles.heroDesc}>按一级分类筛选，进入子分类后快速浏览并加购。</Text>
            </View>
            <View style={styles.rightHeader}>
              <Text style={styles.rightTitle}>{activeParent?.name || '分类'}</Text>
              <Text style={styles.rightSubTitle}>点击进入商品列表</Text>
            </View>

            <View style={styles.grid}>
              {rightPanelNodes.map((node) => (
                <Pressable key={node.id} style={styles.gridItem} onPress={() => openCategory(node)}>
                  <Text style={styles.gridItemText} numberOfLines={2}>
                    {node.name}
                  </Text>
                  <Text style={styles.gridItemAction}>进入</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    width: 96,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  leftContent: {
    paddingVertical: spacing.sm,
  },
  leftItem: {
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  leftItemActive: {
    backgroundColor: colors.primarySoft,
    borderLeftColor: colors.primaryPressed,
  },
  leftItemText: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  leftItemTextActive: {
    color: colors.primaryPressed,
    fontWeight: '800',
  },
  rightColumn: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rightContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
  heroDesc: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    marginTop: spacing.xs,
  },
  rightHeader: {
    marginBottom: spacing.md,
  },
  rightTitle: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '700',
  },
  rightSubTitle: {
    marginTop: spacing.xxs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  gridItemText: {
    flex: 1,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textStrong,
    fontWeight: '500',
  },
  gridItemAction: {
    marginLeft: spacing.xs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.warning,
    fontWeight: '800',
  },
});
