import { client } from '@/api/client';
import type { SellerDashboardMetrics, SellerShopAuditStatus } from '@/types/dashboard';
import type { SellerOrderListData } from '@/types/order';

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

async function fetchSellerOrders(status?: number): Promise<SellerOrderListData> {
  const { data } = await client.get<ApiEnvelope<SellerOrderListData>>('/api/v1/seller/orders', {
    params: {
      status,
      page: 1,
      page_size: 1,
    },
  });
  return data.data;
}

export async function fetchSellerDashboardMetrics(): Promise<SellerDashboardMetrics> {
  const [all, pending, delivering, arrived, completed, cancelled] = await Promise.all([
    fetchSellerOrders(),
    fetchSellerOrders(0),
    fetchSellerOrders(2),
    fetchSellerOrders(3),
    fetchSellerOrders(4),
    fetchSellerOrders(5),
  ]);

  return {
    total_orders: all.pagination.total || 0,
    pending_orders: pending.pagination.total || 0,
    delivering_orders: delivering.pagination.total || 0,
    arrived_orders: arrived.pagination.total || 0,
    completed_orders: completed.pagination.total || 0,
    cancelled_orders: cancelled.pagination.total || 0,
  };
}

export async function fetchSellerShopAuditStatus(): Promise<SellerShopAuditStatus | null> {
  try {
    const { data } = await client.get<ApiEnvelope<SellerShopAuditStatus>>('/api/v1/seller/shop/audit-status');
    return data.data;
  } catch {
    return null;
  }
}
