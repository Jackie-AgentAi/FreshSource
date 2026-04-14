import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchSellerOrders } from '@/api/order';
import { sellerOrderStatusLabel } from '@/constants/order';
import type { SellerOrderListItem } from '@/types/order';

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

  return (
    <View style={styles.page}>
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
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          onEndReachedThreshold={0.25}
          onEndReached={() => void onEndReached()}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 14 }} /> : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error || '暂无订单'}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/orders/${item.id}`)}>
              <View style={styles.row}>
                <Text style={styles.orderNo}>#{item.order_no}</Text>
                <Text style={styles.status}>{sellerOrderStatusLabel(item.status)}</Text>
              </View>
              <Text style={styles.meta}>买家ID：{item.buyer_id}</Text>
              <Text style={styles.meta}>
                收货：{item.receiver_name} {item.receiver_phone}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                地址：{item.receiver_address}
              </Text>
              <Text style={styles.pay}>应收 ¥{item.pay_amount}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f9fafb',
  },
  chipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eaf2ff',
  },
  chipText: {
    fontSize: 12,
    color: '#4b5563',
  },
  chipTextActive: {
    color: '#1d4ed8',
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
    color: '#6b7280',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNo: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
    flex: 1,
  },
  status: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
    marginLeft: 8,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: '#4b5563',
  },
  pay: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f766e',
  },
});
