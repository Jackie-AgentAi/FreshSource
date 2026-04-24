import axios from 'axios';
import { router } from 'expo-router';

import { refreshTokenRequest } from '@/api/auth';
import { API_BASE_URL, BUSINESS_SUCCESS_CODE, TOKEN_INVALID_CODE } from '@/constants/api';
import { useAuthStore } from '@/store/auth';

export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

let refreshPromise: Promise<string> | null = null;

function isTokenExpiredMessage(message?: string): boolean {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('token invalid') || normalized.includes('token expired') || normalized.includes('expired');
}

async function clearAuthAndRedirectToLogin() {
  const store = useAuthStore.getState();
  await store.clearAuth();
  router.replace('/(auth)/login');
}

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(async (response) => {
  const body = response.data as { code?: number; data?: any; message?: string };
  if (body?.code === BUSINESS_SUCCESS_CODE || body?.code === undefined) {
    return response;
  }

  if (body.code === TOKEN_INVALID_CODE) {
    const store = useAuthStore.getState();
    if (!store.refreshToken) {
      await clearAuthAndRedirectToLogin();
      throw new Error('登录已过期，请重新登录');
    }

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshed = await refreshTokenRequest(store.refreshToken);
        if (refreshed.code !== BUSINESS_SUCCESS_CODE) {
          await clearAuthAndRedirectToLogin();
          throw new Error('登录已过期，请重新登录');
        }

        await store.setAuth({
          accessToken: refreshed.data.access_token,
          refreshToken: refreshed.data.refresh_token,
          phone: store.phone,
          role: store.role,
        });
        return refreshed.data.access_token;
      })();
    }

    try {
      const nextAccessToken = await refreshPromise;
      const retryConfig = {
        ...response.config,
        headers: {
          ...response.config.headers,
          Authorization: `Bearer ${nextAccessToken}`,
        },
      };
      return client.request(retryConfig);
    } catch {
      await clearAuthAndRedirectToLogin();
      throw new Error('登录已过期，请重新登录');
    } finally {
      refreshPromise = null;
    }
  }

  if (isTokenExpiredMessage(body.message)) {
    await clearAuthAndRedirectToLogin();
    throw new Error('登录已过期，请重新登录');
  }

  throw new Error(body.message || '请求失败');
}, async (error) => {
  const body = error?.response?.data as { code?: number; message?: string } | undefined;
  if (body?.code === TOKEN_INVALID_CODE || isTokenExpiredMessage(body?.message)) {
    await clearAuthAndRedirectToLogin();
    throw new Error('登录已过期，请重新登录');
  }

  if (error?.code === 'ECONNABORTED') {
    throw new Error('请求超时，请稍后重试');
  }
  if (error?.message === 'Network Error') {
    throw new Error('网络异常，请检查连接后重试');
  }

  throw error instanceof Error ? error : new Error('请求失败');
});
