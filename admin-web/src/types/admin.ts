export interface UserItem {
  id: number;
  phone: string;
  nickname: string;
  role: number;
  status: number;
  created_at: string;
  last_login_at?: string | null;
}

export interface ShopItem {
  id: number;
  user_id: number;
  shop_name: string;
  logo: string;
  description: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  audit_status: number;
  audit_remark: string;
  status: number;
  total_sales: number;
  rating: number;
  created_at: string;
}

export interface ProductItem {
  id: number;
  shop_id: number;
  category_id: number;
  name: string;
  subtitle: string;
  cover_image: string;
  price: number;
  stock: number;
  sales: number;
  status: number;
  is_recommend: number;
  created_at?: string;
}

export interface CategoryItem {
  id: number;
  parent_id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: number;
  children?: CategoryItem[];
}

export interface OrderItem {
  id: number;
  order_no: string;
  shop_id: number;
  shop_name: string;
  buyer_id: number;
  status: number;
  settlement_status: number;
  total_amount: string;
  pay_amount: string;
  created_at: string;
}

export interface BannerItem {
  id: number;
  title: string;
  image_url: string;
  link_type: number;
  link_value: string;
  position: string;
  sort_order: number;
  status: number;
  start_time?: string | null;
  end_time?: string | null;
}

export interface ConfigItem {
  id: number;
  config_key: string;
  config_value: string;
  remark: string;
  created_at: string;
  updated_at: string;
}
