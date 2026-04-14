import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: '返回' }} />;
}
