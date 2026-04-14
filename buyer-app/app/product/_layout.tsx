import { Stack } from 'expo-router';

export default function ProductLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: '返回' }} />;
}
