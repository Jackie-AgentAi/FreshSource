import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuthStore } from '@/store/auth';

export default function ProfilePage() {
  const phone = useAuthStore((s) => s.phone);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ marginBottom: 16 }}>当前账号：{phone || '-'}</Text>
      <Pressable
        style={{
          backgroundColor: '#cf1322',
          height: 40,
          minWidth: 120,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={async () => {
          await clearAuth();
          router.replace('/(auth)/login');
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>退出登录</Text>
      </Pressable>
    </View>
  );
}
