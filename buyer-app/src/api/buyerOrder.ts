import { unwrapApiData } from '@/api/envelope';
import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type {
  BuyerOrderDetail,
  BuyerOrderListData,
  OrderConfirmResult,
  OrderCreateResult,
} from '@/types/order';
import { normalizeUserAddress } from '@/utils/address';

export interface BuyerOrderSubmitPayload {
  address_id: number;
  delivery_type: number;
  cart_item_ids: number[];
  items?: { product_id: number; quantity: number }[];
  buyer_remark?: string;
}

function mapConfirm(raw: Record<string, unknown>): OrderConfirmResult {
  const addr = raw.address;
  return {
    address: normalizeUserAddress((typeof addr === 'object' && addr ? addr : {}) as Record<string, unknown>),
    groups: (raw.groups as OrderConfirmResult['groups']) || [],
    total_pay_amount: String(raw.total_pay_amount ?? ''),
  };
}

export async function confirmBuyerOrder(payload: BuyerOrderSubmitPayload): Promise<OrderConfirmResult> {
  const { data } = await client.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/v1/buyer/orders/confirm',
    payload,
  );
  const row = unwrapApiData(data);
  return mapConfirm(row);
}

export async function createBuyerOrders(payload: BuyerOrderSubmitPayload): Promise<OrderCreateResult> {
  const { data } = await client.post<ApiEnvelope<OrderCreateResult>>('/api/v1/buyer/orders', payload);
  return unwrapApiData(data);
}

export async function fetchBuyerOrders(params?: {
  status?: number;
  page?: number;
  page_size?: number;
}): Promise<BuyerOrderListData> {
  const { data } = await client.get<ApiEnvelope<BuyerOrderListData>>('/api/v1/buyer/orders', { params });
  return unwrapApiData(data);
}

export async function fetchBuyerOrderDetail(orderId: number): Promise<BuyerOrderDetail> {
  const { data } = await client.get<ApiEnvelope<BuyerOrderDetail>>(`/api/v1/buyer/orders/${orderId}`);
  return unwrapApiData(data);
}

export async function cancelBuyerOrder(orderId: number, cancel_reason?: string): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok?: boolean }>>(
    `/api/v1/buyer/orders/${orderId}/cancel`,
    { cancel_reason },
  );
  unwrapApiData(data);
}

export async function receiveBuyerOrder(orderId: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok?: boolean }>>(
    `/api/v1/buyer/orders/${orderId}/receive`,
    {},
  );
  unwrapApiData(data);
}

export async function reorderBuyerOrder(orderId: number): Promise<void> {
  const { data } = await client.post<ApiEnvelope<{ ok?: boolean }>>(
    `/api/v1/buyer/orders/${orderId}/reorder`,
    {},
  );
  unwrapApiData(data);
}

export async function deleteBuyerOrder(orderId: number): Promise<void> {
  const { data } = await client.delete<ApiEnvelope<{ ok?: boolean }>>(`/api/v1/buyer/orders/${orderId}`);
  unwrapApiData(data);
}
