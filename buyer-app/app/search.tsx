import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchBuyerProducts } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { PageContainer } from '@/components/PageContainer';
import { ProductCard } from '@/components/ProductCard';
import type { BuyerProductItem } from '@/types/catalog';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function SearchScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState<BuyerProductItem[]>([]);
  const [searched, setSearched] = useState(false);

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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
              <ProductCard item={item} onPress={() => router.push(`/product/${item.id}`)} />
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
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  searchBtnText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.caption,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
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
