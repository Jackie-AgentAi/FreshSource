import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SellerMetricCard } from '@/components/SellerMetricCard';
import { SellerStatusBadge } from '@/components/SellerStatusBadge';
import { fetchSellerDashboardMetrics } from '@/api/dashboard';
import { fetchSellerShopAuditStatus } from '@/api/shop';
import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';
import type { SellerDashboardMetrics } from '@/types/dashboard';
import type { SellerShopAuditStatus } from '@/types/shop';
import { formatChineseDate } from '@/utils/seller';

function auditStatusLabel(status: number): string {
  if (status === 1) return '审核通过';
  if (status === 2) return '审核拒绝';
  return '审核中';
}

function shopBusinessLabel(status: number): string {
  return status === 1 ? '营业中' : '已关店';
}

type WorkbenchMetricKey = 'total_orders' | 'pending_orders' | 'delivering_orders' | 'arrived_orders' | 'completed_orders' | 'cancelled_orders';

const CARD_KEYS: Array<{ key: WorkbenchMetricKey; label: string }> = [
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
    range: 'day',
    summary: {
      revenue: '0.00',
      order_count: 0,
      average_order_value: '0.00',
      revenue_growth_rate: '0.00',
      order_growth_rate: '0.00',
    },
    fulfillment: {
      total_orders: 0,
      pending_orders: 0,
      delivering_orders: 0,
      arrived_orders: 0,
      completed_orders: 0,
      cancelled_orders: 0,
    },
    product: {
      on_sale_count: 0,
      pending_audit_count: 0,
      warehouse_count: 0,
      low_stock_count: 0,
    },
    inventory_alerts: [],
    message_overview: {
      unread_count: 0,
      latest_title: '',
    },
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
      CARD_KEYS.map(({ key, label }, index) => ({
        key,
        label,
        value: metrics[key],
        icon:
          index === 0 ? 'stats-chart' :
          index === 1 ? 'time' :
          index === 2 ? 'bicycle' :
          index === 3 ? 'checkmark-done' :
          index === 4 ? 'trophy' :
          'close-circle',
      })),
    [metrics],
  );

  const urgentTasks = useMemo(
    () =>
      [
        {
          key: 'pending',
          title: '待确认订单',
          desc: '超过 30 分钟未处理需要优先跟进',
          count: metrics.pending_orders,
          color: sellerColors.orange,
          onPress: () => router.push('/orders'),
        },
        {
          key: 'delivering',
          title: '配送中订单',
          desc: '关注履约进度，减少买家催单',
          count: metrics.delivering_orders,
          color: sellerColors.info,
          onPress: () => router.push('/orders'),
        },
        {
          key: 'arrived',
          title: '已送达待完成',
          desc: '提醒买家确认收货，便于对账',
          count: metrics.arrived_orders,
          color: sellerColors.warning,
          onPress: () => router.push('/orders'),
        },
      ].filter((item) => item.count > 0),
    [metrics.arrived_orders, metrics.delivering_orders, metrics.pending_orders],
  );

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroKicker}>履约看板</Text>
            <Text style={styles.heroDate}>{formatChineseDate()}</Text>
          </View>
          <View style={styles.heroChip}>
            <Ionicons name="flash" size={14} color="#FFFFFF" />
            <Text style={styles.heroChipText}>实时</Text>
          </View>
        </View>

        <Text style={styles.heroValue}>{metrics.pending_orders}</Text>
        <Text style={styles.heroLabel}>待确认订单</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatValue}>{metrics.total_orders}</Text>
            <Text style={styles.heroStatLabel}>累计订单</Text>
          </View>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatValue}>{metrics.delivering_orders}</Text>
            <Text style={styles.heroStatLabel}>配送中</Text>
          </View>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatValue}>{metrics.arrived_orders}</Text>
            <Text style={styles.heroStatLabel}>待完成</Text>
          </View>
        </View>
      </View>

      <View style={styles.shopCard}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>店铺状态</Text>
          {shop ? <SellerStatusBadge label={auditStatusLabel(shop.audit_status)} /> : null}
        </View>
        {shop ? (
          <>
            <Text style={styles.shopName}>{shop.shop_name || `店铺 #${shop.shop_id}`}</Text>
            <Text style={styles.shopInfo}>营业状态：{shopBusinessLabel(shop.status)}</Text>
            {shop.audit_remark ? <Text style={styles.shopRemark}>备注：{shop.audit_remark}</Text> : null}
          </>
        ) : (
          <Text style={styles.shopInfo}>暂无店铺信息（可能尚未入驻）</Text>
        )}
      </View>

      {urgentTasks.length > 0 ? (
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>紧急待办</Text>
            <Text style={styles.sectionHint}>{urgentTasks.reduce((sum, item) => sum + item.count, 0)} 项</Text>
          </View>
          <View style={styles.todoList}>
            {urgentTasks.map((task) => (
              <Pressable key={task.key} style={({ pressed }) => [styles.todoItem, pressed ? styles.todoPressed : null]} onPress={task.onPress}>
                <View style={[styles.todoDot, { backgroundColor: task.color }]} />
                <View style={styles.todoBody}>
                  <Text style={styles.todoTitle}>{task.title}</Text>
                  <Text style={styles.todoDesc}>{task.desc}</Text>
                </View>
                <View style={styles.todoMeta}>
                  <Text style={[styles.todoCount, { color: task.color }]}>{task.count}</Text>
                  <Ionicons name="chevron-forward" size={16} color={sellerColors.muted} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>经营概览</Text>
        <Text style={styles.sectionHint}>按当前订单状态汇总</Text>
      </View>
      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.key} style={styles.metricWrap}>
            <SellerMetricCard
              label={card.label}
              value={card.value}
              icon={<Ionicons name={card.icon as any} size={18} color={sellerColors.primary} />}
            />
          </View>
        ))}
      </View>

      <View>
        <Text style={styles.sectionTitle}>快捷入口</Text>
        <View style={styles.quickGrid}>
          <Pressable style={({ pressed }) => [styles.quickCard, pressed ? styles.quickPressed : null]} onPress={() => router.push('/orders')}>
            <View style={styles.quickIconPrimary}>
              <Ionicons name="receipt-outline" size={22} color={sellerColors.primary} />
            </View>
            <Text style={styles.quickTitle}>订单管理</Text>
            <Text style={styles.quickDesc}>处理接单、发货与送达</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.quickCard, pressed ? styles.quickPressed : null]} onPress={() => router.push('/products')}>
            <View style={styles.quickIconSoft}>
              <Ionicons name="cube-outline" size={22} color={sellerColors.foreground} />
            </View>
            <Text style={styles.quickTitle}>商品管理</Text>
            <Text style={styles.quickDesc}>查看库存、编辑商品、快速改价</Text>
          </Pressable>
        </View>
        <View style={styles.quickGrid}>
          <Pressable style={({ pressed }) => [styles.quickCard, pressed ? styles.quickPressed : null]} onPress={() => router.push('/statistics')}>
            <View style={styles.quickIconSoft}>
              <Ionicons name="bar-chart-outline" size={22} color={sellerColors.foreground} />
            </View>
            <Text style={styles.quickTitle}>数据统计</Text>
            <Text style={styles.quickDesc}>查看订单、商品和库存的聚合情况</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.quickCard, pressed ? styles.quickPressed : null]} onPress={() => router.push('/messages')}>
            <View style={styles.quickIconSoft}>
              <Ionicons name="notifications-outline" size={22} color={sellerColors.foreground} />
            </View>
            <Text style={styles.quickTitle}>消息中心</Text>
            <Text style={styles.quickDesc}>集中查看待处理提醒和系统消息</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={18} color="#AD6800" />
        <View style={styles.tipBody}>
          <Text style={styles.tipTitle}>营业提示</Text>
          <Text style={styles.tipText}>建议优先处理待确认订单，并及时检查库存为 0 或低库存商品，减少取消与拒单。</Text>
        </View>
      </View>

      {loading ? <Text style={styles.loading}>加载中...</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: sellerColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: sellerColors.primary,
    borderRadius: sellerRadius.xl,
    padding: 18,
    ...sellerShadow,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroKicker: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
  },
  heroDate: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: sellerRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroValue: {
    marginTop: 18,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroLabel: {
    marginTop: 2,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  heroStats: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  heroStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: sellerRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
  },
  shopCard: {
    marginTop: 14,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: sellerColors.border,
    ...sellerShadow,
  },
  sectionRow: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  sectionHint: {
    fontSize: 12,
    color: sellerColors.muted,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: sellerColors.foreground,
    marginBottom: 4,
  },
  shopInfo: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 2,
  },
  shopRemark: {
    marginTop: 6,
    fontSize: 12,
    color: sellerColors.destructive,
  },
  todoList: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    overflow: 'hidden',
    ...sellerShadow,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: sellerColors.border,
  },
  todoPressed: {
    backgroundColor: '#FAFAFA',
  },
  todoDot: {
    width: 9,
    height: 9,
    borderRadius: sellerRadius.pill,
    marginRight: 12,
  },
  todoBody: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  todoDesc: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  todoCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricWrap: {
    width: '50%',
    padding: 4,
  },
  quickGrid: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 16,
    ...sellerShadow,
  },
  quickPressed: {
    opacity: 0.94,
  },
  quickIconPrimary: {
    width: 42,
    height: 42,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconSoft: {
    width: 42,
    height: 42,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  quickDesc: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: sellerColors.muted,
  },
  errorBox: {
    marginTop: 14,
    backgroundColor: sellerColors.destructiveSoft,
    borderRadius: sellerRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFCCC7',
  },
  errorText: {
    color: sellerColors.destructive,
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: sellerColors.destructive,
    borderRadius: sellerRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tipCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: sellerColors.warningSoft,
    borderRadius: sellerRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE7BA',
  },
  tipBody: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#AD6800',
  },
  tipText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#7C5E10',
  },
  loading: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: sellerColors.muted,
  },
});
