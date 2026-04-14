import { unwrapApiData } from '@/api/envelope';
import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { CartShopGroup } from '@/types/cart';

export async function fetchCart(): Promise<CartShopGroup[]> {
  const { data } = await client.get<ApiEnvelope<CartShopGroup[]>>('/api/v1/buyer/cart');
  return unwrapApiData(data);
}

export async function addCartItem(body: {
  product_id: number;
  sku_id?: number | null;
  quantity: number;
}): Promise<unknown> {
  const { data } = await client.post<ApiEnvelope<unknown>>('/api/v1/buyer/cart', body);
  return unwrapApiData(data);
}

export async function updateCartItemQuantity(cartItemId: number, quantity: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ updated?: boolean }>>(
    `/api/v1/buyer/cart/${cartItemId}`,
    { quantity },
  );
  unwrapApiData(data);
}

export async function deleteCartItem(cartItemId: number): Promise<void> {
  const { data } = await client.delete<ApiEnvelope<{ deleted?: boolean }>>(
    `/api/v1/buyer/cart/${cartItemId}`,
  );
  unwrapApiData(data);
}

export async function deleteCartBatch(ids: number[]): Promise<void> {
  const { data } = await client.delete<ApiEnvelope<{ deleted?: boolean }>>(
    '/api/v1/buyer/cart/batch',
    { data: { ids } },
  );
  unwrapApiData(data);
}

export async function selectAllCartItems(selected: 0 | 1): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ updated?: boolean }>>('/api/v1/buyer/cart/select-all', {
    selected,
  });
  unwrapApiData(data);
}

export async function clearInvalidCart(): Promise<number> {
  const { data } = await client.delete<ApiEnvelope<{ deleted_count?: number }>>(
    '/api/v1/buyer/cart/invalid',
  );
  const res = unwrapApiData(data);
  return typeof res === 'object' && res && 'deleted_count' in res
    ? Number((res as { deleted_count?: number }).deleted_count) || 0
    : 0;
}
