import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = '8080';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function extractHost(hostUri?: string | null): string {
  if (!hostUri) {
    return '';
  }

  const normalized = hostUri.replace(/^https?:\/\//, '');
  return normalized.split(':')[0] || '';
}

function resolveDefaultBaseUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost ||
    '';
  const host = extractHost(hostUri);

  if (host && host !== '127.0.0.1' && host !== 'localhost') {
    return `http://${host}:${API_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://127.0.0.1:${API_PORT}`;
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || resolveDefaultBaseUrl(),
);

export const BUSINESS_SUCCESS_CODE = 0;
export const TOKEN_INVALID_CODE = 10002;
