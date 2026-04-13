import axios from 'axios';

import { refreshTokenRequest } from '@/api/auth';
import { API_BASE_URL, BUSINESS_SUCCESS_CODE, TOKEN_INVALID_CODE } from '@/constants/api';
import { useAuthStore } from '@/store/auth';

export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

let refreshing = false;

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

  if (body.code === TOKEN_INVALID_CODE && !refreshing) {
    const store = useAuthStore.getState();
    if (!store.refreshToken) {
      await store.clearAuth();
      throw new Error(body.message || 'token invalid');
    }

    try {
      refreshing = true;
      const refreshed = await refreshTokenRequest(store.refreshToken);
      if (refreshed.code !== BUSINESS_SUCCESS_CODE) {
        await store.clearAuth();
        throw new Error(refreshed.message || 'refresh token failed');
      }

      await store.setAuth({
        accessToken: refreshed.data.access_token,
        refreshToken: refreshed.data.refresh_token,
        phone: store.phone,
        role: store.role,
      });

      const retryConfig = {
        ...response.config,
        headers: {
          ...response.config.headers,
          Authorization: `Bearer ${refreshed.data.access_token}`,
        },
      };
      return client.request(retryConfig);
    } finally {
      refreshing = false;
    }
  }

  throw new Error(body.message || 'request failed');
});
