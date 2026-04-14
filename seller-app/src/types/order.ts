import type { Pagination } from '@/types/api';

export interface SellerOrderListItem {
  id: number;
  order_no: string;
  buyer_id: number;
  status: number;
  total_amount: string;
  freight_amount: string;
  pay_amount: string;
  item_count: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  created_at: string;
}

export interface SellerOrderListData {
  list: SellerOrderListItem[];
  pagination: Pagination;
}

export interface SellerOrderItemView {
  product_id: number;
  sku_id: number | null;
  product_name: string;
  product_image: string;
  unit: string;
  price: string;
  quantity: string;
  subtotal: string;
}

export interface SellerOrderDetail {
  id: number;
  order_no: string;
  shop_id: number;
  buyer_id: number;
  status: number;
  settlement_status: number;
  total_amount: string;
  freight_amount: string;
  discount_amount: string;
  pay_amount: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  delivery_type: number;
  buyer_remark: string;
  seller_remark: string;
  cancel_reason: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  items: SellerOrderItemView[];
}
