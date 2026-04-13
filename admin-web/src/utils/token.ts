const ACCESS_TOKEN_KEY = 'fm_admin_access_token';
const REFRESH_TOKEN_KEY = 'fm_admin_refresh_token';
const ADMIN_PHONE_KEY = 'fm_admin_phone';

export function getAccessToken(): string {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAdminPhone(phone: string) {
  localStorage.setItem(ADMIN_PHONE_KEY, phone);
}

export function getAdminPhone(): string {
  return localStorage.getItem(ADMIN_PHONE_KEY) || '';
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PHONE_KEY);
}
