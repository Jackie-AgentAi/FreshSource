import type { LoginData } from '@/types/auth';
import { apiRequest } from '@/utils/http';

export async function loginByPassword(phone: string, password: string) {
  return apiRequest<LoginData>('/api/v1/common/auth/login', {
    method: 'POST',
    data: { phone, password },
    skipRefresh: true,
  });
}

export async function refreshToken(refreshToken: string) {
  return apiRequest<LoginData>('/api/v1/common/auth/refresh', {
    method: 'POST',
    data: { refresh_token: refreshToken },
    skipRefresh: true,
  });
}

export async function logout(refreshTokenValue: string) {
  return apiRequest<{ logged_out: boolean }>('/api/v1/common/auth/logout', {
    method: 'POST',
    data: { refresh_token: refreshTokenValue },
    skipRefresh: true,
  });
}
