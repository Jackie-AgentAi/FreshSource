import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchCategoryTree } from '@/api/catalog';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { CategoryTreeNode } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

function findNode(tree: CategoryTreeNode[], id: number): CategoryTreeNode | undefined {
  for (const n of tree) {
    if (n.id === id) {
      return n;
    }
    if (n.children?.length) {
      const found = findNode(n.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export default function CategorySubScreen() {
  const { parentId } = useLocalSearchParams<{ parentId: string }>();
  const router = useRouter();
  const pid = Number(parentId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('子分类');
  const [children, setChildren] = useState<CategoryTreeNode[]>([]);

  const load = useCallback(async () => {
    if (!Number.isFinite(pid) || pid <= 0) {
      setError('无效的分类');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const tree = await fetchCategoryTree();
      const node = findNode(tree, pid);
      if (!node) {
        setError('分类不存在');
        return;
      }
      setTitle(node.name);
      setChildren(node.children || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => {
    void load();
  }, [load]);

  const data = useMemo(() => children, [children]);

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
      <AppHeader title={title} subtitle="选择子分类进入商品列表" />
      <View style={styles.summaryBar}>
        <Text style={styles.summaryLabel}>子分类数量</Text>
        <Text style={styles.summaryValue}>{data.length}</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="暂无子分类" description="返回上一级试试" />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/category/${item.id}`)}
            accessibilityRole="button"
          >
            <Text style={styles.rowText}>{item.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  summaryBar: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...elevation.sm,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  summaryValue: {
    color: colors.accent,
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  rowText: {
    fontSize: typography.body,
    color: colors.textStrong,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    color: colors.warning,
  },
});
