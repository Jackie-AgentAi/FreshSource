import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { SellerOrderCard } from '@/components/SellerOrderCard';
import { fetchSellerOrders } from '@/api/order';
import { sellerOrderStatusLabel } from '@/constants/order';
import { sellerColors, sellerRadius } from '@/theme/seller';
import type { SellerOrderListItem } from '@/types/order';
import { isOrderUrgent } from '@/utils/seller';

const FILTERS = [
  { key: 'all', label: '全部', value: undefined as number | undefined },
  { key: '0', label: '待确认', value: 0 },
  { key: '1', label: '已接单', value: 1 },
  { key: '2', label: '配送中', value: 2 },
  { key: '3', label: '已送达', value: 3 },
  { key: '5', label: '已取消', value: 5 },
];

export default function SellerOrderListTab() {
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<SellerOrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      const data = await fetchSellerOrders({
        status,
        page: targetPage,
        page_size: 20,
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

  const filters = useMemo(() => FILTERS, []);
  const filteredItems = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return items;
    }
    return items.filter(
      (item) =>
        item.order_no.includes(trimmed) ||
        item.receiver_name.includes(trimmed) ||
        item.receiver_phone.includes(trimmed) ||
        item.receiver_address.includes(trimmed),
    );
  }, [items, keyword]);
  const urgentCount = useMemo(
    () => filteredItems.filter((item) => isOrderUrgent(item.created_at, item.status)).length,
    [filteredItems],
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>订单管理</Text>
        <Text style={styles.subtitle}>聚焦待确认、配送中与已送达订单</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={sellerColors.muted} />
        <TextInput
          style={styles.searchInput}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="搜索订单号、联系人、地址"
          placeholderTextColor={sellerColors.muted}
        />
      </View>

      <View style={styles.filters}>
        {filters.map((f) => {
          const active = f.value === status || (f.value === undefined && status === undefined);
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
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 14 }} /> : null}
          ListHeaderComponent={
            urgentCount > 0 && (status === undefined || status === 0) ? (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
                <View style={styles.warningBody}>
                  <Text style={styles.warningTitle}>紧急待处理</Text>
                  <Text style={styles.warningDesc}>有 {urgentCount} 笔订单超过 30 分钟未确认，请优先处理。</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error || (keyword ? '未找到相关订单' : '暂无订单')}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SellerOrderCard item={item} urgent={isOrderUrgent(item.created_at, item.status)} onPress={() => router.push(`/orders/${item.id}`)} />
          )}
        />
      )}
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
  warningCard: {
    marginBottom: 12,
    backgroundColor: sellerColors.orange,
    borderRadius: sellerRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningBody: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warningDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.92)',
  },
});
