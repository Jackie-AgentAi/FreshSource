import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchBuyerProducts } from '@/api/catalog';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

const SEARCH_HISTORY = ['意大利红酒', '特级橄榄油', '精品咖啡豆', '手工奶酪'];
const HOT_TERMS = ['进口葡萄酒', '冷萃咖啡豆', '特级橄榄油', '有机茶饮', '蜂蜜果酱', '手工巧克力'];
const DISCOVERY_TERMS = ['红酒专区', '精品咖啡', '进口奶酪', '调味油醋'];

export default function SearchScreen() {
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
      const res = await searchBuyerProducts({ keyword: q, page: 1, page_size: 20 });
      setList(res.list);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜索失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  return (
    <PageContainer>
      <AppHeader title="搜索商品" subtitle="按关键词快速查找商品" />
      <View style={styles.toolbar}>
        <TextInput
          style={styles.input}
          placeholder="输入商品名称"
          placeholderTextColor={colors.textMuted}
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          onSubmitEditing={() => void runSearch()}
        />
        <Pressable style={styles.searchBtn} onPress={() => void runSearch()} accessibilityRole="button">
          <Text style={styles.searchBtnText}>搜索</Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingView message="搜索中…" />
      ) : error ? (
        <ErrorRetryView message={error} onRetry={() => void runSearch()} />
      ) : !searched ? (
        <View style={styles.guideWrap}>
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>搜索历史</Text>
            <View style={styles.tagWrap}>
              {SEARCH_HISTORY.map((term) => (
                <Pressable key={term} style={styles.termTag} onPress={() => setKeyword(term)}>
                  <Text style={styles.termText}>{term}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>热门搜索</Text>
            <View style={styles.hotGrid}>
              {HOT_TERMS.map((term, idx) => (
                <Pressable key={term} style={styles.hotItem} onPress={() => setKeyword(term)}>
                  <Text style={[styles.hotRank, idx < 3 && styles.hotRankTop]}>{idx + 1}</Text>
                  <Text style={styles.hotText}>{term}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>发现好货</Text>
            <View style={styles.discoveryGrid}>
              {DISCOVERY_TERMS.map((term) => (
                <Pressable key={term} style={styles.discoveryItem} onPress={() => setKeyword(term)}>
                  <Text style={styles.discoveryText}>{term}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : list.length === 0 ? (
        <EmptyState title="未找到相关商品" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
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
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    backgroundColor: colors.background,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    ...elevation.sm,
  },
  searchBtnText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  guideWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  guideSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...elevation.sm,
  },
  guideTitle: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  termTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  termText: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.primary,
    fontWeight: '600',
  },
  hotGrid: {
    gap: spacing.sm,
  },
  hotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hotRank: {
    width: 20,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  hotRankTop: {
    color: colors.warning,
  },
  hotText: {
    flex: 1,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textStrong,
    fontWeight: '600',
  },
  discoveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  discoveryItem: {
    width: '48%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
  },
  discoveryText: {
    color: colors.warning,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
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
