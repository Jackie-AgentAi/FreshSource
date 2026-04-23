import type { Pagination } from '@/types/api';

export type SellerNotificationType = 'order' | 'product' | 'system';

export interface SellerNotificationItem {
  id: number;
  type: SellerNotificationType;
  title: string;
  content: string;
  biz_type: string;
  biz_id: number | null;
  is_read: number;
  created_at: string;
}

export interface SellerNotificationListData {
  list: SellerNotificationItem[];
  pagination: Pagination;
}
