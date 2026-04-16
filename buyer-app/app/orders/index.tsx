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
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { BUYER_ORDER_FILTERS, getOrderStatusTag } from '@/constants/order';
import type { BuyerOrderListItem } from '@/types/order';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

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
    navigation.setOptions({ headerShown: false });
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

  const filters = useMemo(() => BUYER_ORDER_FILTERS, []);

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
      <AppHeader title="订单管理" subtitle="全状态筛选与履约追踪" />
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
              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor: getOrderStatusTag(item.status).bgColor,
                    borderColor: getOrderStatusTag(item.status).borderColor,
                  },
                ]}
              >
                <Text style={[styles.status, { color: getOrderStatusTag(item.status).textColor }]}>
                  {getOrderStatusTag(item.status).label}
                </Text>
              </View>
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
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primaryGlow,
    backgroundColor: colors.primarySoft,
  },
  filterText: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
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
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '700',
    flex: 1,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  status: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  orderNo: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  pay: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.primaryPressed,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
});
