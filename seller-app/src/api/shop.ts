import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { SellerShopAuditStatus, SellerShopDetail, SellerShopFormPayload } from '@/types/shop';

function unwrap<T>(resp: ApiEnvelope<T>): T {
  if (resp.code !== 0 || resp.data === undefined || resp.data === null) {
    throw new Error(resp.message || 'request failed');
  }
  return resp.data;
}

export async function fetchSellerShop(): Promise<SellerShopDetail | null> {
  try {
    const { data } = await client.get<ApiEnvelope<SellerShopDetail>>('/api/v1/seller/shop');
    return unwrap(data);
  } catch {
    return null;
  }
}

export async function fetchSellerShopAuditStatus(): Promise<SellerShopAuditStatus | null> {
  return fetchSellerShop();
}

export async function updateSellerShop(payload: SellerShopFormPayload): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>('/api/v1/seller/shop', payload);
  unwrap(data);
}

export async function updateSellerShopStatus(status: 0 | 1): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>('/api/v1/seller/shop/status', { status });
  unwrap(data);
}
