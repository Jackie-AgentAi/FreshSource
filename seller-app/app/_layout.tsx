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
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen name="products" options={{ headerShown: false }} />
    </Stack>
  );
}
