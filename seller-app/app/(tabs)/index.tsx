import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchSellerDashboardMetrics, fetchSellerShopAuditStatus } from '@/api/dashboard';
import type { SellerDashboardMetrics, SellerShopAuditStatus } from '@/types/dashboard';

function auditStatusLabel(status: number): string {
  if (status === 1) return '审核通过';
  if (status === 2) return '审核拒绝';
  return '审核中';
}

function shopBusinessLabel(status: number): string {
  return status === 1 ? '营业中' : '已关店';
}

const CARD_KEYS: Array<{ key: keyof SellerDashboardMetrics; label: string }> = [
  { key: 'total_orders', label: '订单总数' },
  { key: 'pending_orders', label: '待确认' },
  { key: 'delivering_orders', label: '配送中' },
  { key: 'arrived_orders', label: '已送达' },
  { key: 'completed_orders', label: '已完成' },
  { key: 'cancelled_orders', label: '已取消' },
];

export default function WorkbenchPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<SellerDashboardMetrics>({
    total_orders: 0,
    pending_orders: 0,
    delivering_orders: 0,
    arrived_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
  });
  const [shop, setShop] = useState<SellerShopAuditStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [nextMetrics, nextShop] = await Promise.all([
        fetchSellerDashboardMetrics(),
        fetchSellerShopAuditStatus(),
      ]);
      setMetrics(nextMetrics);
      setShop(nextShop);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const cards = useMemo(
    () =>
      CARD_KEYS.map(({ key, label }) => ({
        key,
        label,
        value: metrics[key],
      })),
    [metrics],
  );

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.title}>发货端工作台</Text>
      <Text style={styles.subtitle}>接口非 500，数据与后端保持一致</Text>
      <View style={styles.quickActions}>
        <Pressable style={styles.quickBtn} onPress={() => router.push('/orders')}>
          <Text style={styles.quickBtnText}>订单履约</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => router.push('/products')}>
          <Text style={styles.quickBtnText}>商品管理</Text>
        </Pressable>
      </View>

      <View style={styles.shopCard}>
        <Text style={styles.sectionTitle}>店铺状态</Text>
        {shop ? (
          <>
            <Text style={styles.shopName}>{shop.shop_name || `店铺 #${shop.shop_id}`}</Text>
            <Text style={styles.shopInfo}>审核：{auditStatusLabel(shop.audit_status)}</Text>
            <Text style={styles.shopInfo}>营业：{shopBusinessLabel(shop.status)}</Text>
            {shop.audit_remark ? <Text style={styles.shopRemark}>备注：{shop.audit_remark}</Text> : null}
          </>
        ) : (
          <Text style={styles.shopInfo}>暂无店铺信息（可能尚未入驻）</Text>
        )}
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.key} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{card.label}</Text>
            <Text style={styles.metricValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? <Text style={styles.loading}>加载中...</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
  },
  quickActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  shopCard: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  shopInfo: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 2,
  },
  shopRemark: {
    marginTop: 6,
    fontSize: 12,
    color: '#9b1c1c',
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricCard: {
    width: '50%',
    padding: 4,
  },
  metricLabel: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 13,
    color: '#6b7280',
  },
  metricValue: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  errorBox: {
    marginTop: 14,
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fecdd3',
  },
  errorText: {
    color: '#9f1239',
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loading: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
  },
});
