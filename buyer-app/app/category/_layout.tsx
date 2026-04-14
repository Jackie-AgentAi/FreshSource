import { Stack } from 'expo-router';

export default function CategoryStackLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: '返回' }} />;
}
