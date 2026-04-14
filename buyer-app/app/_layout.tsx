import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="category" options={{ headerShown: false }} />
      <Stack.Screen name="product" options={{ headerShown: false }} />
      <Stack.Screen name="shop" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: true, title: '搜索商品' }} />
      <Stack.Screen name="checkout" options={{ headerShown: true, title: '确认订单' }} />
      <Stack.Screen name="addresses" options={{ headerShown: false }} />
    </Stack>
  );
}
