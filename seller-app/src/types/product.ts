import type { Pagination } from '@/types/api';

export interface SellerProduct {
  id: number;
  shop_id: number;
  category_id: number;
  name: string;
  subtitle: string;
  cover_image: string;
  images: string[];
  description: string;
  price: number;
  original_price: number | null;
  unit: string;
  min_buy: number;
  step_buy: number;
  stock: number;
  status: number;
  origin_place: string;
  shelf_life: string;
  storage_method: string;
  sort_order: number;
}

export interface SellerProductListData {
  list: SellerProduct[];
  pagination: Pagination;
}

export interface SaveSellerProductPayload {
  category_id: number;
  name: string;
  subtitle: string;
  cover_image: string;
  images: string[];
  description: string;
  price: number;
  original_price?: number | null;
  unit: string;
  min_buy: number;
  step_buy: number;
  stock: number;
  origin_place: string;
  shelf_life: string;
  storage_method: string;
  sort_order: number;
}
