import type { Pagination } from '@/types/api';
import type { UserAddress } from '@/types/address';

export interface OrderConfirmLineItem {
  product_id: number;
  name: string;
  price: string;
  quantity: string;
  subtotal: string;
}

export interface OrderConfirmShopGroup {
  shop_id: number;
  shop_name: string;
  items: OrderConfirmLineItem[];
  total_amount: string;
  freight_amount: string;
  pay_amount: string;
}

export interface OrderConfirmResult {
  address: UserAddress;
  groups: OrderConfirmShopGroup[];
  total_pay_amount: string;
}

export interface OrderCreateResult {
  order_ids: number[];
}

export interface BuyerOrderListItem {
  id: number;
  order_no: string;
  shop_id: number;
  shop_name: string;
  status: number;
  total_amount: string;
  freight_amount: string;
  pay_amount: string;
  item_count: number;
  created_at: string;
}

export interface BuyerOrderListData {
  list: BuyerOrderListItem[];
  pagination: Pagination;
}

export interface BuyerOrderItemView {
  product_id: number;
  sku_id: number | null;
  product_name: string;
  product_image: string;
  unit: string;
  price: string;
  quantity: string;
  subtotal: string;
}

export interface BuyerOrderDetail {
  id: number;
  order_no: string;
  shop_id: number;
  shop_name: string;
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
  cancel_reason: string;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  completed_at: string | null;
  items: BuyerOrderItemView[];
}
