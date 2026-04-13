import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/auth';

export default function EntryPage() {
  const initialized = useAuthStore((s) => s.initialized);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  if (!initialized) {
    return null;
  }

  if (accessToken && role === 1) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/login" />;
}
