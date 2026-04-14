export interface CategoryTreeNode {
  id: number;
  parent_id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: number;
  children: CategoryTreeNode[];
}

export interface BuyerShopVO {
  id: number;
  shop_name: string;
  logo: string;
  description: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  rating: number;
  total_sales: number;
}

export interface BuyerProductItem {
  id: number;
  shop_id: number;
  category_id: number;
  name: string;
  subtitle: string;
  cover_image: string;
  price: number;
  original_price: number | null;
  unit: string;
  min_buy: number;
  step_buy: number;
  stock: number;
  status: number;
  is_invalid: boolean;
  can_buy: boolean;
  shop: BuyerShopVO;
}

export interface BuyerProductDetail extends BuyerProductItem {
  images: string[];
  description: string;
  origin_place: string;
  shelf_life: string;
  storage_method: string;
}

export interface ShopHomePagination {
  page: number;
  page_size: number;
  total: number;
}

export interface BuyerShopHomepage {
  shop: BuyerShopVO;
  products: BuyerProductItem[];
  pagination: ShopHomePagination;
}
