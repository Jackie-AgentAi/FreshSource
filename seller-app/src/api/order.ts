import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/auth';
import type { SellerOrderDetail, SellerOrderListData, SellerOrderListItem } from '@/types/order';

function unwrap<T>(resp: ApiEnvelope<T>): T {
  if (resp.code !== 0 || resp.data === undefined || resp.data === null) {
    throw new Error(resp.message || 'request failed');
  }
  return resp.data;
}

export async function fetchSellerOrders(params?: {
  status?: number;
  page?: number;
  page_size?: number;
}): Promise<SellerOrderListData> {
  const { data } = await client.get<ApiEnvelope<SellerOrderListData>>('/api/v1/seller/orders', { params });
  return unwrap(data);
}

export async function fetchAllSellerOrders(params?: {
  status?: number;
}): Promise<SellerOrderListItem[]> {
  const result: SellerOrderListItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await fetchSellerOrders({
      status: params?.status,
      page,
      page_size: 100,
    });
    result.push(...data.list);
    totalPages = data.pagination.total_pages || 1;
    page += 1;
  } while (page <= totalPages);

  return result;
}

export async function fetchSellerOrderDetail(orderId: number): Promise<SellerOrderDetail> {
  const { data } = await client.get<ApiEnvelope<SellerOrderDetail>>(`/api/v1/seller/orders/${orderId}`);
  return unwrap(data);
}

export async function confirmSellerOrder(orderId: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>(`/api/v1/seller/orders/${orderId}/confirm`, {});
  unwrap(data);
}

export async function rejectSellerOrder(orderId: number, reason: string): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>(`/api/v1/seller/orders/${orderId}/reject`, {
    reason,
  });
  unwrap(data);
}

export async function deliverSellerOrder(orderId: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>(`/api/v1/seller/orders/${orderId}/deliver`, {});
  unwrap(data);
}

export async function arrivedSellerOrder(orderId: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>(`/api/v1/seller/orders/${orderId}/arrived`, {});
  unwrap(data);
}

export async function updateSellerOrderRemark(orderId: number, sellerRemark: string): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>(`/api/v1/seller/orders/${orderId}/remark`, {
    seller_remark: sellerRemark,
  });
  unwrap(data);
}
