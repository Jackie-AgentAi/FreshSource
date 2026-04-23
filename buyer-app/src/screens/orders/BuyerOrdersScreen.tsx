import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cancelBuyerOrder,
  deleteBuyerOrder,
  fetchBuyerOrderDetail,
  fetchBuyerOrders,
  receiveBuyerOrder,
  reorderBuyerOrder,
} from '@/api/buyerOrder';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { BuyerOrderListItem } from '@/types/order';
import { colors, lineHeight, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

import { OrderListCard } from './components/OrderListCard';

type OrderFilter = 'all' | 'pending' | 'shipping' | 'delivered' | 'completed';

const FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'shipping', label: '配送中' },
  { key: 'delivered', label: '已送达' },
  { key: 'completed', label: '已完成' },
];

function matchFilter(item: BuyerOrderListItem, filter: OrderFilter): boolean {
  switch (filter) {
    case 'pending':
      return item.status === 0 || item.status === 1;
    case 'shipping':
      return item.status === 2;
    case 'delivered':
      return item.status === 3;
    case 'completed':
      return item.status === 4 || item.status === 5;
    default:
      return true;
  }
}

function statusDisplay(status: number): { label: string; tone: 'green' | 'amber' | 'gray' | 'red' } {
  switch (status) {
    case 2:
      return { label: '配送中', tone: 'green' };
    case 3:
      return { label: '已送达', tone: 'green' };
    case 4:
      return { label: '已完成', tone: 'gray' };
    case 5:
      return { label: '已取消', tone: 'red' };
    default:
      return { label: '待确认', tone: 'amber' };
  }
}

export function BuyerOrdersScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [orders, setOrders] = useState<BuyerOrderListItem[]>([]);
  const [imagesByOrderId, setImagesByOrderId] = useState<Record<number, string[]>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const result = await fetchBuyerOrders({ page: 1, page_size: 50 });
      setOrders(result.list);
    } catch (error) {
      setOrders([]);
      setErrorMessage(error instanceof Error ? error.message : '订单加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (
      filter === 'all' ||
      filter === 'pending' ||
      filter === 'shipping' ||
      filter === 'delivered' ||
      filter === 'completed'
    ) {
      setActiveFilter(filter);
    }
  }, [filter]);

  useEffect(() => {
    if (orders.length === 0) {
      setImagesByOrderId({});
      return;
    }
    void (async () => {
      const results = await Promise.allSettled(orders.map((item) => fetchBuyerOrderDetail(item.id)));
      const nextMap: Record<number, string[]> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          nextMap[orders[index].id] = result.value.items
            .slice(0, 2)
            .map((line) => resolveMediaUrl(line.product_image))
            .filter(Boolean) as string[];
        }
      });
      setImagesByOrderId(nextMap);
    })();
  }, [orders]);

  const filteredOrders = useMemo(() => orders.filter((item) => matchFilter(item, activeFilter)), [activeFilter, orders]);

  const runAction = async (action: () => Promise<void>, successText: string) => {
    try {
      await action();
      await load();
      Alert.alert('成功', successText);
    } catch (error) {
      Alert.alert('失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  if (loading && orders.length === 0) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (errorMessage && orders.length === 0) {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>我的订单</Text>
        <View style={styles.headerIcon} />
      </View>

      <View style={styles.tabsRow}>
        {FILTERS.map((filter) => {
          const active = filter.key === activeFilter;
          return (
            <Pressable
              accessibilityRole="button"
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={[styles.tabItem, active && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <EmptyState title="暂无订单" description="还没有符合当前筛选条件的订单" />
        ) : (
          filteredOrders.map((item) => {
            const status = statusDisplay(item.status);
            const actions = [];
            if (item.status === 2) {
              actions.push({
                key: 'detail',
                label: '查看物流',
                onPress: () => router.push(`/orders/${item.id}`),
              });
            }
            if (item.status === 3) {
              actions.push({
                key: 'detail',
                label: '查看物流',
                onPress: () => router.push(`/orders/${item.id}`),
              });
              actions.push({
                key: 'receive',
                label: '确认收货',
                primary: true,
                onPress: () => void runAction(() => receiveBuyerOrder(item.id), '已确认收货'),
              });
            }
            if (item.status === 0 || item.status === 1) {
              actions.push({
                key: 'cancel',
                label: '取消订单',
                onPress: () => void runAction(() => cancelBuyerOrder(item.id), '订单已取消'),
              });
              actions.push({
                key: 'detail',
                label: '查看详情',
                primary: true,
                onPress: () => router.push(`/orders/${item.id}`),
              });
            }
            if (item.status === 4) {
              actions.push({
                key: 'reorder',
                label: '再来一单',
                onPress: () => void runAction(() => reorderBuyerOrder(item.id), '商品已重新加入购物车'),
              });
              actions.push({
                key: 'review',
                label: '评价',
                primary: true,
                onPress: () => Alert.alert('提示', '评价页下一步继续接入'),
              });
            }
            if (item.status === 5) {
              actions.push({
                key: 'delete',
                label: '删除订单',
                primary: true,
                onPress: () => void runAction(() => deleteBuyerOrder(item.id), '订单已删除'),
              });
            }

            return (
              <OrderListCard
                actions={actions}
                images={imagesByOrderId[item.id] ?? []}
                item={item}
                key={item.id}
                onPress={() => router.push(`/orders/${item.id}`)}
                statusLabel={status.label}
                statusTone={status.tone}
              />
            );
          })
        )}
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 72,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.textStrong,
    fontWeight: '700',
  },
  tabsRow: {
    minHeight: 62,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tabItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: colors.primarySoft,
  },
  tabText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    padding: spacing.md,
    backgroundColor: colors.background,
    paddingBottom: 120,
  },
});
