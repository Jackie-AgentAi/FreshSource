import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchSellerDashboardMetrics } from '@/api/dashboard';
import { SellerMetricCard } from '@/components/SellerMetricCard';
import { SellerScreenHeader } from '@/components/SellerScreenHeader';
import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';
import type { SellerDashboardMetrics, SellerDashboardRange } from '@/types/dashboard';
import { formatCurrency, parseAmount } from '@/utils/seller';

const RANGE_LABEL: Record<SellerDashboardRange, string> = {
  day: '今日',
  week: '近7天',
  month: '本月',
};

export default function StatisticsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeRange, setActiveRange] = useState<SellerDashboardRange>('day');
  const [metrics, setMetrics] = useState<SellerDashboardMetrics | null>(null);

  const load = useCallback(async (range: SellerDashboardRange = activeRange) => {
    const nextMetrics = await fetchSellerDashboardMetrics(range);
    setMetrics(nextMetrics);
  }, [activeRange]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const rangeStats = metrics?.summary;
  const fulfillment = metrics?.fulfillment;
  const productStats = metrics?.product;
  const lowStockProducts = metrics?.inventory_alerts ?? [];

  return (
    <View style={styles.page}>
      <SellerScreenHeader title="数据统计" onBack={() => router.back()} />

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={styles.rangeRow}>
          {(['day', 'week', 'month'] as SellerDashboardRange[]).map((key) => {
            const active = key === activeRange;
            return (
              <Text
                key={key}
                style={[styles.rangeChip, active ? styles.rangeChipActive : null]}
                onPress={() => {
                  setActiveRange(key);
                  void load(key);
                }}
              >
                {RANGE_LABEL[key]}
              </Text>
            );
          })}
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{RANGE_LABEL[activeRange]}营业额</Text>
          <Text style={styles.heroValue}>{formatCurrency(parseAmount(rangeStats?.revenue ?? '0'))}</Text>
          <Text style={styles.heroHint}>数据来自后端 `/seller/dashboard` 聚合接口，按所选时间范围实时统计。</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metricWrap}>
            <SellerMetricCard
              label={`${RANGE_LABEL[activeRange]}订单`}
              value={rangeStats?.order_count ?? 0}
              hint={`${Number(rangeStats?.order_growth_rate ?? 0) >= 0 ? '+' : ''}${rangeStats?.order_growth_rate ?? '0.00'}% vs 上周期`}
              icon={<Ionicons name="receipt-outline" size={18} color={sellerColors.primary} />}
            />
          </View>
          <View style={styles.metricWrap}>
            <SellerMetricCard
              label="平均客单价"
              value={formatCurrency(parseAmount(rangeStats?.average_order_value ?? '0'))}
              hint={`${Number(rangeStats?.revenue_growth_rate ?? 0) >= 0 ? '+' : ''}${rangeStats?.revenue_growth_rate ?? '0.00'}% 收入变化`}
              icon={<Ionicons name="cash-outline" size={18} color={sellerColors.primary} />}
            />
          </View>
          <View style={styles.metricWrap}>
            <SellerMetricCard
              label="在售商品"
              value={productStats?.on_sale_count ?? 0}
              icon={<Ionicons name="cube-outline" size={18} color={sellerColors.primary} />}
            />
          </View>
          <View style={styles.metricWrap}>
            <SellerMetricCard
              label="审核中商品"
              value={productStats?.pending_audit_count ?? 0}
              icon={<Ionicons name="time-outline" size={18} color={sellerColors.primary} />}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>履约概览</Text>
          <View style={styles.summaryRow}>
            <SummaryItem label="待确认" value={fulfillment?.pending_orders ?? 0} />
            <SummaryItem label="配送中" value={fulfillment?.delivering_orders ?? 0} />
            <SummaryItem label="待完成" value={fulfillment?.arrived_orders ?? 0} />
            <SummaryItem label="已完成" value={fulfillment?.completed_orders ?? 0} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>库存预警</Text>
          {lowStockProducts.length > 0 ? (
            lowStockProducts.map((product) => (
              <View key={product.product_id} style={styles.stockRow}>
                <View style={styles.stockBody}>
                  <Text style={styles.stockName}>{product.name}</Text>
                  <Text style={styles.stockMeta}>{formatCurrency(parseAmount(product.price))} / {product.unit}</Text>
                </View>
                <Text style={styles.stockDanger}>仅剩 {product.stock}{product.unit}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>当前没有低库存商品。</Text>
          )}
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color="#AD6800" />
          <View style={styles.tipBody}>
            <Text style={styles.tipTitle}>统计口径说明</Text>
            <Text style={styles.tipText}>今日、近 7 天和本月分别由后端按时间窗口聚合，并与上一个等长周期计算变化率。</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
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
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  rangeChip: {
    overflow: 'hidden',
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.card,
    borderWidth: 1,
    borderColor: sellerColors.border,
    color: sellerColors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  rangeChipActive: {
    backgroundColor: sellerColors.primary,
    borderColor: sellerColors.primary,
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.xl,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 18,
    ...sellerShadow,
  },
  heroLabel: {
    fontSize: 13,
    color: sellerColors.muted,
  },
  heroValue: {
    marginTop: 10,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: sellerColors.primary,
  },
  heroHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 14,
  },
  metricWrap: {
    width: '50%',
    padding: 4,
  },
  card: {
    marginTop: 14,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 16,
    ...sellerShadow,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '25%',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: sellerColors.foreground,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: sellerColors.border,
  },
  stockBody: {
    flex: 1,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  stockMeta: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  stockDanger: {
    marginLeft: 12,
    fontSize: 12,
    color: sellerColors.destructive,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: sellerColors.muted,
  },
  tipCard: {
    marginTop: 14,
    backgroundColor: sellerColors.warningSoft,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: '#FFE7BA',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
});
