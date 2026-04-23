import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { SaveSellerProductPayload, SellerProduct, SellerProductListData } from '@/types/product';

function unwrap<T>(resp: ApiEnvelope<T>): T {
  if (resp.code !== 0 || resp.data === undefined || resp.data === null) {
    throw new Error(resp.message || 'request failed');
  }
  return resp.data;
}

export async function fetchSellerProducts(params?: {
  page?: number;
  page_size?: number;
  status?: number;
}): Promise<SellerProductListData> {
  const { data } = await client.get<ApiEnvelope<SellerProductListData>>('/api/v1/seller/products', { params });
  return unwrap(data);
}

export async function fetchAllSellerProducts(params?: {
  status?: number;
}): Promise<SellerProduct[]> {
  const result: SellerProduct[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await fetchSellerProducts({
      page,
      page_size: 100,
      status: params?.status,
    });
    result.push(...data.list);
    totalPages = data.pagination.total_pages || 1;
    page += 1;
  } while (page <= totalPages);

  return result;
}

export async function fetchSellerProductById(productId: number): Promise<SellerProduct | null> {
  let page = 1;
  while (page <= 10) {
    const data = await fetchSellerProducts({ page, page_size: 100 });
    const found = data.list.find((item) => item.id === productId);
    if (found) {
      return found;
    }
    if (page >= data.pagination.total_pages) {
      break;
    }
    page += 1;
  }
  return null;
}

export async function createSellerProduct(payload: SaveSellerProductPayload): Promise<SellerProduct> {
  const { data } = await client.post<ApiEnvelope<SellerProduct>>('/api/v1/seller/products', payload);
  return unwrap(data);
}

export async function updateSellerProduct(productId: number, payload: SaveSellerProductPayload): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ updated: boolean }>>(
    `/api/v1/seller/products/${productId}`,
    payload,
  );
  unwrap(data);
}

export async function updateSellerProductStatus(productId: number, status: 0 | 1): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ updated: boolean }>>(
    `/api/v1/seller/products/${productId}/status`,
    { status },
  );
  unwrap(data);
}

export async function batchUpdateSellerProductPrices(items: Array<{ id: number; price: number }>): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ updated: boolean }>>('/api/v1/seller/products/batch-price', items);
  unwrap(data);
}
