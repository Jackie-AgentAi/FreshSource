import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchBuyerNotificationUnreadCount } from '@/api/notification';
import { AppHeader } from '@/components/AppHeader';
import { PageContainer } from '@/components/PageContainer';
import { useAuthStore } from '@/store/auth';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

export default function ProfilePage() {
  const phone = useAuthStore((s) => s.phone);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        try {
          const n = await fetchBuyerNotificationUnreadCount();
          setUnread(n);
        } catch {
          setUnread(0);
        }
      })();
    }, []),
  );

  return (
    <PageContainer>
      <AppHeader title="个人中心" subtitle="账户与常用功能" />
      <View style={styles.wrap}>
        <View style={styles.profileCard}>
          <Text style={styles.phoneLabel}>当前账号</Text>
          <Text style={styles.phone}>{phone || '-'}</Text>
        </View>

        <View style={styles.menuCard}>
          <Pressable style={styles.menuBtn} onPress={() => router.push('/orders')}>
            <Text style={styles.menuText}>我的订单</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable style={styles.menuBtn} onPress={() => router.push('/addresses')}>
            <Text style={styles.menuText}>收货地址</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable style={styles.menuBtn} onPress={() => router.push('/notifications')}>
            <Text style={styles.menuText}>消息中心{unread > 0 ? `（${unread}）` : ''}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.logout}
          onPress={async () => {
            await clearAuth();
            router.replace('/(auth)/login');
          }}
        >
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...elevation.sm,
  },
  phoneLabel: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  phone: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  menuCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...elevation.sm,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuText: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.textMuted,
  },
  logout: {
    marginTop: spacing.lg,
    backgroundColor: colors.statusDangerText,
    height: 44,
    minWidth: 140,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
  },
  logoutText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
});
