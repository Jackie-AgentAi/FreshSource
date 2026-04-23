import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { SellerCategoryTreeNode } from '@/types/category';

function unwrap<T>(resp: ApiEnvelope<T>): T {
  if (resp.code !== 0 || resp.data === undefined || resp.data === null) {
    throw new Error(resp.message || 'request failed');
  }
  return resp.data;
}

export async function fetchSellerCategoryTree(): Promise<SellerCategoryTreeNode[]> {
  const { data } = await client.get<ApiEnvelope<SellerCategoryTreeNode[]>>('/api/v1/seller/categories');
  return unwrap(data);
}
