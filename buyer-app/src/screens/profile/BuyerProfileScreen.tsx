import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchBuyerNotificationUnreadCount } from '@/api/notification';
import { fetchBuyerOrders } from '@/api/buyerOrder';
import { PageContainer } from '@/components/PageContainer';
import { useAuthStore } from '@/store/auth';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { showToast } from '@/utils/toast';

type OrderSummary = {
  delivered: number;
  completed: number;
  total: number;
};

type QuickStatusItem = {
  key: string;
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  tintColor: string;
};

type MenuItem = {
  key: string;
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  onPress: () => void;
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
      delivered:
        deliveredResult.status === 'fulfilled' ? deliveredResult.value.pagination.total : 0,
      completed:
        completedResult.status === 'fulfilled' ? completedResult.value.pagination.total : 0,
      total: totalResult.status === 'fulfilled' ? totalResult.value.pagination.total : 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  const quickStatusItems = useMemo<QuickStatusItem[]>(
    () => [
      {
        key: 'delivered',
        label: '待收货',
        count: orderSummary.delivered,
        icon: 'cube-outline',
        tintColor: colors.primaryGlow,
      },
      {
        key: 'review',
        label: '待评价',
        count: orderSummary.completed,
        icon: 'document-text-outline',
        tintColor: '#F59E0B',
      },
      {
        key: 'done',
        label: '已完成',
        count: orderSummary.completed,
        icon: 'receipt-outline',
        tintColor: colors.textMuted,
      },
    ],
    [orderSummary.completed, orderSummary.delivered],
  );

  const primaryMenus = useMemo<MenuItem[]>(
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Ionicons color={colors.surface} name="person-outline" size={40} />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>订货买家</Text>
            <Text style={styles.heroPhone}>{maskPhone(phone)}</Text>
            <Text style={styles.heroDesc}>鲜源采购常用功能入口</Text>
          </View>
          <Ionicons color={colors.surface} name="chevron-forward" size={28} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/search')}
          style={styles.quickOrderCard}
        >
          <View style={styles.quickOrderBody}>
            <Text style={styles.quickOrderTitle}>快速下单</Text>
            <Text style={styles.quickOrderDesc}>一键采购常用商品</Text>
          </View>
          <View style={styles.quickOrderIcon}>
            <Ionicons color={colors.surface} name="bag-handle-outline" size={28} />
          </View>
        </Pressable>

        <View style={styles.statusCard}>
          {quickStatusItems.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.key}
              onPress={() =>
                router.push({
                  pathname: '/orders',
                  params: {
                    filter:
                      item.key === 'delivered'
                        ? 'delivered'
                        : item.key === 'review'
                          ? 'completed'
                          : 'all',
                  },
                })
              }
              style={styles.statusItem}
            >
              <View style={styles.statusIconWrap}>
                <Ionicons color={item.tintColor} name={item.icon} size={24} />
                {item.count > 0 ? (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{item.count > 99 ? '99+' : item.count}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.menuSection}>
          {primaryMenus.map((item, index) => (
            <Pressable
              accessibilityRole="button"
              key={item.key}
              onPress={item.onPress}
              style={[styles.menuRow, index === primaryMenus.length - 1 && styles.menuRowLast]}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons color={colors.primaryGlow} name={item.icon} size={24} />
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
              <Ionicons color={colors.textMuted} name="chevron-forward" size={24} />
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
              <Ionicons color={colors.textMuted} name="chevron-forward" size={24} />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            await clearAuth();
            router.replace('/(auth)/login');
          }}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>

        <Text style={styles.versionText}>版本 v2.1.0</Text>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: '#18A84A',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroAvatar: {
    width: 66,
    height: 66,
    borderRadius: radius.round,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.surface,
    fontWeight: '800',
  },
  heroPhone: {
    marginTop: spacing.sm,
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: colors.surface,
  },
  heroDesc: {
    marginTop: spacing.xxs,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: 'rgba(255,255,255,0.8)',
  },
  quickOrderCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#B8E4C5',
    backgroundColor: '#FFF8EA',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...elevation.sm,
  },
  quickOrderBody: {
    flex: 1,
  },
  quickOrderTitle: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.textStrong,
    fontWeight: '800',
  },
  quickOrderDesc: {
    marginTop: spacing.sm,
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: '#7A8396',
  },
  quickOrderIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.round,
    backgroundColor: '#18A84A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.lg,
  },
  statusCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    width: '30%',
  },
  statusIconWrap: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    right: -2,
    top: -6,
    minWidth: 22,
    height: 22,
    borderRadius: radius.round,
    paddingHorizontal: spacing.xs,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    color: colors.surface,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  statusLabel: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textStrong,
    fontWeight: '600',
  },
  menuSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  menuRow: {
    minHeight: 92,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuBody: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuTitle: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  menuDesc: {
    marginTop: spacing.xxs,
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: '#7A8396',
  },
  menuBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.round,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  menuBadgeText: {
    color: colors.surface,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '700',
  },
  simpleRow: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  simpleTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textStrong,
    fontWeight: '500',
  },
  logoutButton: {
    height: 56,
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: '#EF4444',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  versionText: {
    marginTop: spacing.xxl,
    textAlign: 'center',
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: '#7A8396',
  },
});
