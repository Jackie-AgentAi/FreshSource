import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { fetchCategoryTree } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { CategoryTreeNode } from '@/types/catalog';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Section = { title: string; data: CategoryTreeNode[] };

function buildSections(tree: CategoryTreeNode[]): Section[] {
  return tree.map((parent) => ({
    title: parent.name,
    data: parent.children?.length ? parent.children : [parent],
  }));
}

export default function CategoriesTabPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const tree = await fetchCategoryTree();
      setSections(buildSections(tree));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const tree = await fetchCategoryTree();
      setSections(buildSections(tree));
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
    router.push(`/category/${node.id}`);
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
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openCategory(item)} accessibilityRole="button">
            <Text style={styles.rowText}>{item.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title="暂无分类" />}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowText: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
});
