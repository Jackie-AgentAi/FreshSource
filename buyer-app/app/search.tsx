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
        <EmptyState title="输入关键词后搜索" />
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
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
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
    borderRadius: radius.md,
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
  columnWrap: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  cardCell: {
    flex: 1,
    maxWidth: '50%',
  },
});
