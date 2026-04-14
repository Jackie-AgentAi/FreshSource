import { Stack } from 'expo-router';

export default function ShopLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: '返回' }} />;
}
