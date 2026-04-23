import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SellerStatusBadge } from '@/components/SellerStatusBadge';
import { fetchSellerDashboardMetrics } from '@/api/dashboard';
import { fetchSellerShopAuditStatus } from '@/api/shop';
import { useAuthStore } from '@/store/auth';
import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';
import type { SellerDashboardMetrics } from '@/types/dashboard';
import type { SellerShopAuditStatus } from '@/types/shop';

export default function ProfilePage() {
  const phone = useAuthStore((s) => s.phone);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<SellerDashboardMetrics | null>(null);
  const [shop, setShop] = useState<SellerShopAuditStatus | null>(null);

  const load = useCallback(async () => {
    const [nextMetrics, nextShop] = await Promise.all([
      fetchSellerDashboardMetrics(),
      fetchSellerShopAuditStatus(),
    ]);
    setMetrics(nextMetrics);
    setShop(nextShop);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const statusLabel = shop ? (shop.audit_status === 1 ? '审核通过' : shop.audit_status === 2 ? '审核拒绝' : '审核中') : '未入驻';

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.title}>我的</Text>
      <Text style={styles.subtitle}>查看店铺状态、账号信息和常用入口</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.logoWrap}>
            <Ionicons name="storefront" size={24} color={sellerColors.primary} />
          </View>
          <View style={styles.heroMain}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.shopName}>{shop?.shop_name || '暂未完成店铺入驻'}</Text>
              <SellerStatusBadge label={statusLabel} />
            </View>
            <Text style={styles.phone}>当前账号：{phone || '-'}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics?.total_orders ?? 0}</Text>
            <Text style={styles.metricLabel}>累计订单</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics?.pending_orders ?? 0}</Text>
            <Text style={styles.metricLabel}>待确认</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics?.delivering_orders ?? 0}</Text>
            <Text style={styles.metricLabel}>配送中</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>常用入口</Text>
        <MenuRow icon="receipt-outline" label="订单管理" desc="处理接单、发货、送达" onPress={() => router.push('/orders')} />
        <MenuRow icon="cube-outline" label="商品管理" desc="查看在售、仓库和审核中商品" onPress={() => router.push('/products')} />
        <MenuRow icon="cash-outline" label="快速改价" desc="批量调整在售商品价格" onPress={() => router.push('/quick-price')} />
        <MenuRow icon="bar-chart-outline" label="数据统计" desc="查看订单、商品和库存概览" onPress={() => router.push('/statistics')} />
        <MenuRow icon="notifications-outline" label="消息中心" desc="查看待确认、低库存和系统提醒" onPress={() => router.push('/messages')} />
        <MenuRow icon="settings-outline" label="店铺设置" desc="维护店铺资料与营业状态" onPress={() => router.push('/shop-settings')} />
        <MenuRow
          icon="shield-checkmark-outline"
          label="店铺审核状态"
          desc={shop ? `当前为${statusLabel}` : '尚未查询到店铺信息'}
        />
      </View>

      <Pressable
        style={styles.logoutBtn}
        onPress={async () => {
          await clearAuth();
          router.replace('/(auth)/login');
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        <Text style={styles.logoutText}>退出登录</Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  desc,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed ? styles.menuPressed : null]} onPress={onPress} disabled={!onPress}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={sellerColors.foreground} />
      </View>
      <View style={styles.menuBody}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={sellerColors.muted} /> : null}
    </Pressable>
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
  heroCard: {
    marginTop: 16,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.xl,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 18,
    ...sellerShadow,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 12,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: sellerRadius.lg,
    backgroundColor: sellerColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMain: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  shopName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  phone: {
    marginTop: 8,
    fontSize: 13,
    color: '#666666',
  },
  metricsRow: {
    marginTop: 18,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: sellerColors.border,
    paddingTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: sellerColors.primary,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  card: {
    marginTop: 16,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    overflow: 'hidden',
    ...sellerShadow,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: sellerColors.border,
  },
  menuPressed: {
    backgroundColor: '#FAFAFA',
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuBody: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  menuDesc: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  logoutBtn: {
    marginTop: 18,
    borderRadius: sellerRadius.lg,
    backgroundColor: sellerColors.destructive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
