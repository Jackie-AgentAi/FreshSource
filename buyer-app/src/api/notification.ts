import { unwrapApiData } from '@/api/envelope';
import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { BuyerNotificationListData } from '@/types/notification';

export async function fetchBuyerNotifications(params?: {
  page?: number;
  page_size?: number;
}): Promise<BuyerNotificationListData> {
  const { data } = await client.get<ApiEnvelope<BuyerNotificationListData>>('/api/v1/buyer/notifications', {
    params,
  });
  return unwrapApiData(data);
}

export async function fetchBuyerNotificationUnreadCount(): Promise<number> {
  const { data } = await client.get<ApiEnvelope<{ unread: number }>>('/api/v1/buyer/notifications/unread-count');
  return unwrapApiData(data).unread || 0;
}

export async function markBuyerNotificationRead(id: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>(`/api/v1/buyer/notifications/${id}/read`, {});
  unwrapApiData(data);
}

export async function markBuyerNotificationAllRead(): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>('/api/v1/buyer/notifications/read-all', {});
  unwrapApiData(data);
}
