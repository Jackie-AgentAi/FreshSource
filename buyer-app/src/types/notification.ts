import type { Pagination } from '@/types/api';

export interface BuyerNotificationItem {
  id: number;
  type: string;
  title: string;
  content: string;
  biz_type: string;
  biz_id: number | null;
  is_read: number;
  created_at: string;
}

export interface BuyerNotificationListData {
  list: BuyerNotificationItem[];
  pagination: Pagination;
}
