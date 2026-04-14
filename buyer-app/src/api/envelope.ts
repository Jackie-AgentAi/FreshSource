import type { ApiEnvelope } from '@/types/api';

export function unwrapApiData<T>(payload: ApiEnvelope<T>): T {
  if (payload.code !== 0 || payload.data === undefined || payload.data === null) {
    throw new Error(payload.message || '请求失败');
  }
  return payload.data;
}
