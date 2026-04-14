import { API_BASE_URL } from '@/constants/api';

export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }
  const trimmed = path.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  const suffix = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${suffix}`;
}
