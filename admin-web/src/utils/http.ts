import { history } from '@umijs/max';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/utils/token';
import type { ApiEnvelope } from '@/types/http';

let refreshPromise: Promise<boolean> | null = null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown>;
  headers?: Record<string, string>;
  skipRefresh?: boolean;
};

type RefreshTokenData = {
  access_token: string;
  refresh_token: string;
};

function createFallbackEnvelope<T>(message: string, code = 10000): ApiEnvelope<T> {
  return {
    code,
    message,
    data: null as T,
  };
}

async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { method = 'GET', data, headers = {} } = options;
  const accessToken = getAccessToken();

  try {
    const resp = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const contentType = resp.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? ((await resp.json()) as ApiEnvelope<T>)
      : createFallbackEnvelope<T>('服务返回格式异常');

    if (resp.status === 401 && body.code === undefined) {
      return createFallbackEnvelope<T>('登录状态已失效，请重新登录', 10002);
    }

    return body;
  } catch {
    return createFallbackEnvelope<T>('网络异常，请稍后重试');
  }
}

export function withQuery(
  url: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { skipRefresh = false } = options;
  const body = await requestJson<T>(url, options);
  if (body?.code === 10002 && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return requestJson<T>(url, { ...options, skipRefresh: true });
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
  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const resp = await fetch('/api/v1/common/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return false;
      }
      const body = (await resp.json()) as ApiEnvelope<RefreshTokenData>;
      if (body?.code !== 0 || !body?.data?.access_token || !body?.data?.refresh_token) {
        return false;
      }
      setTokens(body.data.access_token, body.data.refresh_token);
      return true;
    })()
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
