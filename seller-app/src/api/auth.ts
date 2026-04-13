import axios from 'axios';

import { API_BASE_URL } from '@/constants/api';
import type { ApiEnvelope, LoginData } from '@/types/auth';

const plainClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export async function loginByPassword(phone: string, password: string) {
  const resp = await plainClient.post<ApiEnvelope<LoginData>>('/api/v1/common/auth/login', {
    phone,
    password,
  });
  return resp.data;
}

export async function refreshTokenRequest(refreshToken: string) {
  const resp = await plainClient.post<ApiEnvelope<LoginData>>('/api/v1/common/auth/refresh', {
    refresh_token: refreshToken,
  });
  return resp.data;
}
