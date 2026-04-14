import type { BuyerShopVO } from '@/types/catalog';

export interface ProductLite {
  id: number;
  name: string;
  cover_image: string;
  price: number;
  unit: string;
  stock: number;
  status: number;
}

export interface CartItemView {
  id: number;
  product_id: number;
  sku_id: number | null;
  quantity: number;
  selected: number;
  is_invalid: boolean;
  product: ProductLite;
}

export interface CartShopGroup {
  shop_id: number;
  shop: BuyerShopVO;
  items: CartItemView[];
}
