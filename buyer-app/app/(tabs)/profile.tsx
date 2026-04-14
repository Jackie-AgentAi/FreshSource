import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/store/auth';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ProfilePage() {
  const phone = useAuthStore((s) => s.phone);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <View style={styles.wrap}>
      <Text style={styles.phone}>当前账号：{phone || '-'}</Text>
      <Pressable style={styles.menuBtn} onPress={() => router.push('/orders')}>
        <Text style={styles.menuText}>我的订单</Text>
      </Pressable>
      <Pressable style={styles.menuBtn} onPress={() => router.push('/addresses')}>
        <Text style={styles.menuText}>收货地址</Text>
      </Pressable>
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
    backgroundColor: colors.surface,
  },
  phone: {
    marginBottom: spacing.lg,
    fontSize: typography.body,
    color: colors.text,
  },
  menuBtn: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  menuText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  logout: {
    backgroundColor: '#cf1322',
    height: 44,
    minWidth: 120,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  logoutText: {
    color: colors.surface,
    fontWeight: '600',
  },
});
