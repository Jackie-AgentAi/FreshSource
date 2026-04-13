import { history } from '@umijs/max';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/utils/token';
import type { AuthEnvelope } from '@/types/auth';

let refreshing = false;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown>;
  skipRefresh?: boolean;
};

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<AuthEnvelope<T>> {
  const { method = 'GET', data, skipRefresh = false } = options;
  const accessToken = getAccessToken();

  const resp = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  const body = (await resp.json()) as AuthEnvelope<T>;
  if (body?.code === 10002 && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(url, { ...options, skipRefresh: true });
    }
    clearTokens();
    if (history.location.pathname !== '/login') {
      history.push('/login');
    }
  }
  return body;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken || refreshing) {
    return false;
  }

  refreshing = true;
  try {
    const resp = await fetch('/api/v1/common/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await resp.json();
    if (body?.code !== 0 || !body?.data?.access_token || !body?.data?.refresh_token) {
      return false;
    }
    setTokens(body.data.access_token, body.data.refresh_token);
    return true;
  } catch {
    return false;
  } finally {
    refreshing = false;
  }
}
