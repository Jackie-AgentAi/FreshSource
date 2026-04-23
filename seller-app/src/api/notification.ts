import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { SellerNotificationListData, SellerNotificationType } from '@/types/notification';

function unwrap<T>(resp: ApiEnvelope<T>): T {
  if (resp.code !== 0 || resp.data === undefined || resp.data === null) {
    throw new Error(resp.message || 'request failed');
  }
  return resp.data;
}

export async function fetchSellerNotifications(params?: {
  type?: SellerNotificationType;
  page?: number;
  page_size?: number;
}): Promise<SellerNotificationListData> {
  const { data } = await client.get<ApiEnvelope<SellerNotificationListData>>('/api/v1/seller/notifications', {
    params,
  });
  return unwrap(data);
}

export async function fetchSellerNotificationUnreadCount(): Promise<number> {
  const { data } = await client.get<ApiEnvelope<{ count: number }>>('/api/v1/seller/notifications/unread-count');
  return unwrap(data).count;
}

export async function markSellerNotificationRead(notificationId: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>(`/api/v1/seller/notifications/${notificationId}/read`);
  unwrap(data);
}

export async function markAllSellerNotificationsRead(): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ ok: boolean }>>('/api/v1/seller/notifications/read-all');
  unwrap(data);
}
