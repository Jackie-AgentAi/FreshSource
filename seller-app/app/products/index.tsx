import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchSellerProducts, updateSellerProductStatus } from '@/api/product';
import type { SellerProduct } from '@/types/product';

function statusLabel(status: number): string {
  if (status === 1) return '上架';
  if (status === 0) return '下架';
  if (status === 2) return '审核中';
  return `状态${status}`;
}

const FILTERS = [
  { key: 'all', label: '全部', value: undefined as number | undefined },
  { key: '2', label: '审核中', value: 2 },
  { key: '1', label: '已上架', value: 1 },
  { key: '0', label: '已下架', value: 0 },
];

export default function ProductListPage() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<number | undefined>(undefined);
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

  const switchStatus = useCallback(async (item: SellerProduct) => {
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
  }, [initialLoad]);

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
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error || '暂无商品'}</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 14 }} /> : null}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/products/${item.id}`)}>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.meta}>ID {item.id} · 分类 {item.category_id}</Text>
                <Text style={styles.meta}>库存 {item.stock} · 单位 {item.unit || '-'}</Text>
                <Text style={styles.price}>¥{item.price.toFixed(2)}</Text>
                <Text style={styles.status}>状态：{statusLabel(item.status)}</Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => router.push(`/products/${item.id}`)}>
                  <Text style={styles.actionText}>编辑</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, item.status === 2 && styles.disabledBtn]}
                  onPress={() => void switchStatus(item)}
                  disabled={item.status === 2}
                >
                  <Text style={styles.actionText}>{item.status === 1 ? '下架' : '上架'}</Text>
                </Pressable>
              </View>
            </View>
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
  headerBtn: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 14,
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
  name: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  price: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: '#0f766e',
  },
  status: {
    marginTop: 4,
    fontSize: 12,
    color: '#374151',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
