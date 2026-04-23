import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { SellerDashboardMetrics, SellerDashboardRange } from '@/types/dashboard';

function unwrap<T>(resp: ApiEnvelope<T>): T {
  if (resp.code !== 0 || resp.data === undefined || resp.data === null) {
    throw new Error(resp.message || 'request failed');
  }
  return resp.data;
}

function normalizeMetrics(data: Omit<SellerDashboardMetrics, 'total_orders' | 'pending_orders' | 'delivering_orders' | 'arrived_orders' | 'completed_orders' | 'cancelled_orders'>): SellerDashboardMetrics {
  return {
    ...data,
    total_orders: data.fulfillment.total_orders,
    pending_orders: data.fulfillment.pending_orders,
    delivering_orders: data.fulfillment.delivering_orders,
    arrived_orders: data.fulfillment.arrived_orders,
    completed_orders: data.fulfillment.completed_orders,
    cancelled_orders: data.fulfillment.cancelled_orders,
  };
}

export async function fetchSellerDashboardMetrics(range: SellerDashboardRange = 'day'): Promise<SellerDashboardMetrics> {
  const { data } = await client.get<ApiEnvelope<Omit<SellerDashboardMetrics, 'total_orders' | 'pending_orders' | 'delivering_orders' | 'arrived_orders' | 'completed_orders' | 'cancelled_orders'>>>(
    '/api/v1/seller/dashboard',
    {
      params: { range },
    },
  );
  return normalizeMetrics(unwrap(data));
}
