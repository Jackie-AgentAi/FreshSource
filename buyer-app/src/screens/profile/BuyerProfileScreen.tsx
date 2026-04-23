import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchBuyerOrders } from '@/api/buyerOrder';
import { fetchBuyerNotificationUnreadCount } from '@/api/notification';
import { PageContainer } from '@/components/PageContainer';
import { useAuthStore } from '@/store/auth';
import { colors, elevation, radius, spacing } from '@/theme/tokens';
import { showToast } from '@/utils/toast';

type OrderSummary = {
  completed: number;
  delivered: number;
  total: number;
};

type QuickStatusItem = {
  color: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  key: string;
  label: string;
};

type MenuItem = {
  badge?: number;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  key: string;
  onPress: () => void;
  title: string;
};

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) {
    return phone || '-';
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function BuyerProfileScreen() {
  const phone = useAuthStore((state) => state.phone);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    delivered: 0,
    completed: 0,
    total: 0,
  });

  const loadSummary = useCallback(async () => {
    const [unreadResult, deliveredResult, completedResult, totalResult] = await Promise.allSettled([
      fetchBuyerNotificationUnreadCount(),
      fetchBuyerOrders({ status: 3, page: 1, page_size: 1 }),
      fetchBuyerOrders({ status: 4, page: 1, page_size: 1 }),
      fetchBuyerOrders({ page: 1, page_size: 1 }),
    ]);

    setUnreadCount(unreadResult.status === 'fulfilled' ? unreadResult.value : 0);
    setOrderSummary({
      delivered: deliveredResult.status === 'fulfilled' ? deliveredResult.value.pagination.total : 0,
      completed: completedResult.status === 'fulfilled' ? completedResult.value.pagination.total : 0,
      total: totalResult.status === 'fulfilled' ? totalResult.value.pagination.total : 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  const displayName = useMemo(() => (phone ? 'FreshMart 买家' : '未登录用户'), [phone]);
  const companyName = useMemo(() => (phone ? '生鲜订货账号' : '登录后查看账号信息'), [phone]);

  const quickStatusItems = useMemo<QuickStatusItem[]>(
    () => [
      {
        key: 'delivered',
        label: '待收货',
        count: orderSummary.delivered,
        icon: 'cube-outline',
        color: '#16A34A',
      },
      {
        key: 'review',
        label: '待评价',
        count: orderSummary.completed,
        icon: 'document-text-outline',
        color: colors.accent,
      },
      {
        key: 'done',
        label: '已完成',
        count: orderSummary.completed,
        icon: 'bag-handle-outline',
        color: '#6B7280',
      },
    ],
    [orderSummary.completed, orderSummary.delivered],
  );

  const menuItems = useMemo<MenuItem[]>(
    () => [
      {
        key: 'orders',
        title: '我的订单',
        description: `查看全部订单${orderSummary.total > 0 ? ` · ${orderSummary.total} 笔` : ''}`,
        icon: 'cube-outline',
        onPress: () => router.push('/orders'),
      },
      {
        key: 'addresses',
        title: '收货地址',
        description: '管理收货地址',
        icon: 'location-outline',
        onPress: () => router.push('/addresses'),
      },
      {
        key: 'notifications',
        title: '消息中心',
        description: '系统通知、订单消息',
        icon: 'notifications-outline',
        badge: unreadCount,
        onPress: () => router.push('/notifications'),
      },
      {
        key: 'settings',
        title: '设置',
        description: '账号设置、隐私设置',
        icon: 'settings-outline',
        onPress: () => showToast('设置页后续继续接入'),
      },
    ],
    [orderSummary.total, unreadCount],
  );

  const secondaryMenus = useMemo<MenuItem[]>(
    () => [
      {
        key: 'about',
        title: '关于我们',
        icon: 'information-circle-outline',
        onPress: () => showToast('关于我们后续继续接入'),
      },
      {
        key: 'support',
        title: '帮助与反馈',
        icon: 'help-circle-outline',
        onPress: () => showToast('帮助与反馈后续继续接入'),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Ionicons color="#FFFFFF" name="person-outline" size={28} />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{displayName}</Text>
            <Text style={styles.heroPhone}>{maskPhone(phone)}</Text>
            <Text style={styles.heroCompany}>{companyName}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/notifications')} style={styles.heroMessagePill}>
            <Ionicons color="#FFFFFF" name="notifications-outline" size={14} />
            <Text style={styles.heroMessageText}>{unreadCount > 0 ? `${unreadCount} 未读` : '消息'}</Text>
          </Pressable>
        </View>

        <View style={styles.heroMetrics}>
          <View style={styles.heroMetricItem}>
            <Text style={styles.heroMetricValue}>{orderSummary.total}</Text>
            <Text style={styles.heroMetricLabel}>累计订单</Text>
          </View>
          <View style={styles.heroMetricLine} />
          <View style={styles.heroMetricItem}>
            <Text style={styles.heroMetricValue}>{orderSummary.delivered}</Text>
            <Text style={styles.heroMetricLabel}>待收货</Text>
          </View>
          <View style={styles.heroMetricLine} />
          <View style={styles.heroMetricItem}>
            <Text style={styles.heroMetricValue}>{orderSummary.completed}</Text>
            <Text style={styles.heroMetricLabel}>已完成</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/categories')}
            style={styles.quickOrderCard}
          >
            <View>
              <Text style={styles.quickOrderTitle}>快速下单</Text>
              <Text style={styles.quickOrderDesc}>一键采购常用商品</Text>
            </View>
            <View style={styles.quickOrderIcon}>
              <Ionicons color="#FFFFFF" name="bag-handle-outline" size={20} />
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.quickActionRow}>
            {quickStatusItems.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={() => router.push('/orders')}
                style={styles.quickActionItem}
              >
                <View style={styles.quickActionIconWrap}>
                  <Ionicons color={item.color} name={item.icon} size={24} />
                  {item.count > 0 ? (
                    <View style={styles.quickActionBadge}>
                      <Text style={styles.quickActionBadgeText}>{item.count > 99 ? '99+' : item.count}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <Pressable
              accessibilityRole="button"
              key={item.key}
              onPress={item.onPress}
              style={[styles.menuRow, index === menuItems.length - 1 && styles.menuRowLast]}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons color="#16A34A" name={item.icon} size={20} />
              </View>
              <View style={styles.menuBody}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  {item.badge ? (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                    </View>
                  ) : null}
                </View>
                {item.description ? <Text style={styles.menuDesc}>{item.description}</Text> : null}
              </View>
              <Ionicons color="#9CA3AF" name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </View>

        <View style={styles.menuSection}>
          {secondaryMenus.map((item, index) => (
            <Pressable
              accessibilityRole="button"
              key={item.key}
              onPress={item.onPress}
              style={[styles.simpleRow, index === secondaryMenus.length - 1 && styles.menuRowLast]}
            >
              <Text style={styles.simpleTitle}>{item.title}</Text>
              <Ionicons color="#9CA3AF" name="chevron-forward" size={16} />
            </Pressable>
          ))}
        </View>

        <View style={styles.logoutWrap}>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await clearAuth();
              router.replace('/(auth)/login');
            }}
            style={styles.logoutButton}
          >
            <Ionicons color="#DC2626" name="log-out-outline" size={18} />
            <Text style={styles.logoutText}>退出登录</Text>
          </Pressable>
        </View>

        <Text style={styles.versionText}>版本 v2.1.0</Text>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  hero: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...elevation.md,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  heroPhone: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  heroCompany: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  heroMessagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroMessageText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  heroMetrics: {
    marginTop: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...elevation.sm,
  },
  heroMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroMetricValue: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  heroMetricLabel: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  heroMetricLine: {
    width: 1,
    height: 34,
    backgroundColor: colors.divider,
  },
  sectionCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  quickOrderCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickOrderTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  quickOrderDesc: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  quickOrderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  quickActionIconWrap: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  quickActionLabel: {
    color: '#1A1A1A',
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  menuSection: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuBody: {
    flex: 1,
    minWidth: 0,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuTitle: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  menuDesc: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  menuBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  simpleRow: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  simpleTitle: {
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 20,
  },
  logoutWrap: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  logoutButton: {
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...elevation.sm,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  versionText: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
});
