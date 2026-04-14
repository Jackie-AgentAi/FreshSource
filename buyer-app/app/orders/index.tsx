import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchBuyerOrders } from '@/api/buyerOrder';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { orderStatusLabel } from '@/constants/order';
import type { BuyerOrderListItem } from '@/types/order';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const STATUS_FILTERS = [
  { key: 'all', label: '全部', value: undefined as number | undefined },
  { key: '0', label: '待确认', value: 0 },
  { key: '3', label: '已送达', value: 3 },
  { key: '4', label: '已完成', value: 4 },
  { key: '5', label: '已取消', value: 5 },
];

export default function BuyerOrdersScreen() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [list, setList] = useState<BuyerOrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      const data = await fetchBuyerOrders({
        status,
        page: targetPage,
        page_size: 20,
      });
      setPage(targetPage);
      setTotalPages(data.pagination.total_pages || 1);
      setList((prev) => (append ? [...prev, ...data.list] : data.list));
    },
    [status],
  );

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await load(1, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void initialLoad();
    }, [initialLoad]),
  );

  useEffect(() => {
    void initialLoad();
  }, [initialLoad]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: '我的订单' });
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load(1, false);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || loading || page >= totalPages) {
      return;
    }
    try {
      setLoadingMore(true);
      await load(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }, [load, loading, loadingMore, page, totalPages]);

  const filters = useMemo(() => STATUS_FILTERS, []);

  if (loading && list.length === 0) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (error && list.length === 0) {
    return (
      <PageContainer>
        <ErrorRetryView message={error} onRetry={() => void initialLoad()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.filterWrap}>
        {filters.map((f) => {
          const active = f.value === status || (f.value === undefined && status === undefined);
          return (
            <Pressable
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatus(f.value)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        onEndReachedThreshold={0.25}
        onEndReached={() => void onEndReached()}
        ListEmptyComponent={<EmptyState title="暂无订单" />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/orders/${item.id}`)}>
            <View style={styles.cardTop}>
              <Text style={styles.shopName}>{item.shop_name || `店铺#${item.shop_id}`}</Text>
              <Text style={styles.status}>{orderStatusLabel(item.status)}</Text>
            </View>
            <Text style={styles.orderNo}>单号：{item.order_no}</Text>
            <Text style={styles.meta}>商品数：{item.item_count}</Text>
            <Text style={styles.meta}>下单时间：{item.created_at.replace('T', ' ').slice(0, 16)}</Text>
            <Text style={styles.pay}>应付 ¥{item.pay_amount}</Text>
          </Pressable>
        )}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#e8f7ee',
  },
  filterText: {
    fontSize: typography.small,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shopName: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  status: {
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  orderNo: {
    fontSize: typography.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: typography.small,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pay: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
