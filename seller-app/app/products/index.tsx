import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchSellerProducts, updateSellerProductStatus } from '@/api/product';
import { SellerProductCard } from '@/components/SellerProductCard';
import { sellerProductStatusLabel } from '@/constants/product';
import { sellerColors, sellerRadius } from '@/theme/seller';
import type { SellerProduct } from '@/types/product';

const FILTERS = [
  { key: '1', label: '在售', value: 1 },
  { key: '0', label: '仓库', value: 0 },
  { key: '2', label: '审核中', value: 2 },
];

export default function ProductListPage() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<number | undefined>(1);
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<SellerProduct[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      const data = await fetchSellerProducts({
        page: targetPage,
        page_size: 20,
        status,
      });
      setPage(targetPage);
      setTotalPages(data.pagination.total_pages || 1);
      setItems((prev) => (append ? [...prev, ...data.list] : data.list));
    },
    [status],
  );

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await load(1, false);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void initialLoad();
    }, [initialLoad]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '商品管理',
      headerRight: () => (
        <Pressable onPress={() => router.push('/products/new')} hitSlop={12} style={{ marginRight: 10 }}>
          <Text style={styles.headerBtn}>发布</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initialLoad();
    setRefreshing(false);
  }, [initialLoad]);

  const onEndReached = useCallback(async () => {
    if (loading || loadingMore || page >= totalPages) {
      return;
    }
    try {
      setLoadingMore(true);
      await load(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, page, totalPages, load]);

  const switchStatus = useCallback(
    async (item: SellerProduct) => {
      if (item.status === 2) {
        return;
      }
      const next = item.status === 1 ? 0 : 1;
      try {
        await updateSellerProductStatus(item.id, next as 0 | 1);
        await initialLoad();
      } catch (e) {
        setError(e instanceof Error ? e.message : '更新状态失败');
      }
    },
    [initialLoad],
  );

  const filteredItems = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return items;
    }
    return items.filter((item) => item.name.includes(trimmed) || item.subtitle.includes(trimmed));
  }, [items, keyword]);

  const lowStockCount = useMemo(
    () => filteredItems.filter((item) => item.status === 1 && item.stock <= 10).length,
    [filteredItems],
  );
  const zeroStockCount = useMemo(
    () => filteredItems.filter((item) => item.status === 0 && item.stock === 0).length,
    [filteredItems],
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>商品管理</Text>
        <Text style={styles.subtitle}>按在售、仓库、审核中分层管理商品状态</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={sellerColors.muted} />
        <TextInput
          style={styles.searchInput}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="搜索商品名称或副标题"
          placeholderTextColor={sellerColors.muted}
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Pressable
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatus(f.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          onEndReachedThreshold={0.25}
          onEndReached={() => void onEndReached()}
          ListHeaderComponent={
            status === 1 && lowStockCount > 0 ? (
              <View style={styles.bannerDanger}>
                <Ionicons name="warning-outline" size={18} color={sellerColors.destructive} />
                <View style={styles.bannerBody}>
                  <Text style={styles.bannerTitle}>低库存预警</Text>
                  <Text style={styles.bannerText}>有 {lowStockCount} 件在售商品库存不足 10，请及时补货。</Text>
                </View>
              </View>
            ) : status === 0 && zeroStockCount > 0 ? (
              <View style={styles.bannerMuted}>
                <Ionicons name="archive-outline" size={18} color={sellerColors.muted} />
                <View style={styles.bannerBody}>
                  <Text style={styles.bannerTitleDark}>库存提醒</Text>
                  <Text style={styles.bannerTextDark}>有 {zeroStockCount} 件商品因库存为 0 处于下架状态。</Text>
                </View>
              </View>
            ) : status === 2 ? (
              <View style={styles.bannerWarning}>
                <Ionicons name="time-outline" size={18} color="#AD6800" />
                <View style={styles.bannerBody}>
                  <Text style={styles.bannerTitleWarning}>审核中</Text>
                  <Text style={styles.bannerTextWarning}>商品审核通过后才会进入在售列表，请勿重复提交。</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {error || (keyword ? '未找到相关商品' : `暂无${sellerProductStatusLabel(status ?? 1)}商品`)}
              </Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 14 }} /> : null}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SellerProductCard
              item={item}
              onEdit={() => router.push(`/products/${item.id}`)}
              onToggle={() => void switchStatus(item)}
            />
          )}
        />
      )}

      {status === 1 && filteredItems.length > 0 ? (
        <View style={styles.quickPriceBar}>
          <View>
            <Text style={styles.quickPriceTitle}>在售商品 {filteredItems.length} 件</Text>
            <Text style={styles.quickPriceDesc}>批量改价会调用真实的批量调价接口</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.quickPriceBtn, pressed ? styles.quickPricePressed : null]} onPress={() => router.push('/quick-price')}>
            <Text style={styles.quickPriceBtnText}>快速改价</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: sellerColors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: sellerColors.foreground,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: sellerColors.muted,
  },
  headerBtn: {
    color: sellerColors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: sellerColors.foreground,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: sellerColors.border,
    borderRadius: sellerRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: sellerColors.card,
  },
  chipActive: {
    borderColor: '#8DE2C2',
    backgroundColor: sellerColors.primarySoft,
  },
  chipText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  chipTextActive: {
    color: sellerColors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: sellerColors.muted,
    fontSize: 13,
  },
  bannerDanger: {
    marginBottom: 12,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: '#FFCCC7',
    backgroundColor: sellerColors.destructiveSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerWarning: {
    marginBottom: 12,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: '#FFE7BA',
    backgroundColor: sellerColors.warningSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerMuted: {
    marginBottom: 12,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: sellerColors.destructive,
  },
  bannerTitleWarning: {
    fontSize: 13,
    fontWeight: '700',
    color: '#AD6800',
  },
  bannerTitleDark: {
    fontSize: 13,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  bannerText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#8C1D18',
  },
  bannerTextWarning: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#7C5E10',
  },
  bannerTextDark: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#666666',
  },
  quickPriceBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.xl,
    borderWidth: 1,
    borderColor: '#B7EBD6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickPriceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  quickPriceDesc: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  quickPriceBtn: {
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickPricePressed: {
    opacity: 0.94,
  },
  quickPriceBtnText: {
    color: sellerColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
