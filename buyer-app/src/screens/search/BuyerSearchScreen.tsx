import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchBuyerProducts } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

const SEARCH_HISTORY = ['进口红酒', '精品橄榄油', '咖啡豆', '冷链乳品'];
const HOT_TERMS = ['澳洲牛排', '新西兰奶酪', '特级初榨橄榄油', '精品咖啡豆', '冷冻海鲜', '蔬果礼盒'];
const RECOMMEND_TERMS = ['节日食材', '冷藏饮品', '早餐专区', '高复购爆品'];

export function BuyerSearchScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState<BuyerProductItem[]>([]);
  const [searched, setSearched] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const runSearch = useCallback(async () => {
    const q = keyword.trim();
    if (!q) {
      setError('请输入关键词');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await searchBuyerProducts({ keyword: q, page: 1, page_size: 20 });
      setList(result.list);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const renderGuide = () => (
    <View style={styles.guideWrap}>
      <View style={styles.guideSection}>
        <Text style={styles.sectionTitle}>搜索历史</Text>
        <View style={styles.tagWrap}>
          {SEARCH_HISTORY.map((term) => (
            <Pressable
              accessibilityRole="button"
              key={term}
              onPress={() => setKeyword(term)}
              style={styles.historyTag}
            >
              <Text style={styles.historyTagText}>{term}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.guideSection}>
        <Text style={styles.sectionTitle}>热门搜索</Text>
        <View style={styles.hotList}>
          {HOT_TERMS.map((term, index) => (
            <Pressable
              accessibilityRole="button"
              key={term}
              onPress={() => setKeyword(term)}
              style={styles.hotItem}
            >
              <Text style={[styles.hotIndex, index < 3 && styles.hotIndexActive]}>{index + 1}</Text>
              <Text style={styles.hotText}>{term}</Text>
              <Ionicons color={colors.textDisabled} name="trending-up-outline" size={18} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.guideSection}>
        <Text style={styles.sectionTitle}>推荐分类</Text>
        <View style={styles.recommendGrid}>
          {RECOMMEND_TERMS.map((term) => (
            <Pressable
              accessibilityRole="button"
              key={term}
              onPress={() => setKeyword(term)}
              style={styles.recommendItem}
            >
              <Text style={styles.recommendText}>{term}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const renderResultHeader = () => (
    <View style={styles.resultHeader}>
      <Text style={styles.resultTitle}>搜索结果</Text>
      <Text style={styles.resultMeta}>共找到 {list.length} 件商品</Text>
    </View>
  );

  return (
    <PageContainer>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons color={colors.textMuted} name="search-outline" size={20} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={() => void runSearch()}
            placeholder="输入商品名称"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.input}
          />
          {keyword ? (
            <Pressable accessibilityRole="button" onPress={() => setKeyword('')}>
              <Ionicons color={colors.textDisabled} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" onPress={() => void runSearch()} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingView message="搜索中…" />
      ) : error ? (
        <ErrorRetryView message={error} onRetry={() => void runSearch()} />
      ) : !searched ? (
        renderGuide()
      ) : list.length === 0 ? (
        <EmptyState title="未找到相关商品" description="换个关键词试试吧" />
      ) : (
        <FlatList
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          data={list}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderResultHeader}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.cardCell}>
              <ProductCard
                item={item}
                onAddToCart={() => router.push('/(tabs)/cart')}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    paddingVertical: spacing.sm,
  },
  searchButton: {
    minWidth: 68,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: '#18A84A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  searchButtonText: {
    color: colors.surface,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '700',
  },
  guideWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  guideSection: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...elevation.sm,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  historyTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  historyTagText: {
    color: colors.primaryGlow,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '600',
  },
  hotList: {
    gap: spacing.sm,
  },
  hotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hotIndex: {
    width: 18,
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  hotIndexActive: {
    color: '#F59E0B',
  },
  hotText: {
    flex: 1,
    color: colors.textStrong,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
  recommendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recommendItem: {
    width: '48%',
    borderRadius: radius.md,
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: '#F4E1A8',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  recommendText: {
    color: colors.warning,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  resultHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  resultTitle: {
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: colors.textStrong,
    fontWeight: '800',
  },
  resultMeta: {
    marginTop: spacing.xxs,
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
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
