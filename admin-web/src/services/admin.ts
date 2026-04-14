import { apiRequest } from '@/utils/http';

export type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type PaginatedData<T> = {
  list: T[];
  pagination: Pagination;
};

export type UserItem = {
  id: number;
  phone: string;
  nickname: string;
  role: number;
  status: number;
  created_at: string;
  last_login_at?: string | null;
};

export type ShopItem = {
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
};

export type ProductItem = {
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
};

export type CategoryItem = {
  id: number;
  parent_id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: number;
  children?: CategoryItem[];
};

export type OrderItem = {
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
};

export type BannerItem = {
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
};

export type ConfigItem = {
  id: number;
  config_key: string;
  config_value: string;
  remark: string;
  created_at: string;
  updated_at: string;
};

export async function listUsers(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return apiRequest<PaginatedData<UserItem>>(`/api/v1/admin/users?${query.toString()}`, { method: 'GET' });
}

export async function updateUserStatus(id: number, status: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/users/${id}/status`, { method: 'PUT', data: { status } });
}

export async function listShops(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return apiRequest<PaginatedData<ShopItem>>(`/api/v1/admin/shops?${query.toString()}`, { method: 'GET' });
}

export async function auditShop(id: number, audit_status: number, audit_remark: string) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/shops/${id}/audit`, {
    method: 'PUT',
    data: { audit_status, audit_remark },
  });
}

export async function closeShop(id: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/shops/${id}/close`, { method: 'PUT' });
}

export async function listProducts(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return apiRequest<PaginatedData<ProductItem>>(`/api/v1/admin/products?${query.toString()}`, { method: 'GET' });
}

export async function auditProduct(id: number, audit_status: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/products/${id}/audit`, { method: 'PUT', data: { audit_status } });
}

export async function updateProductStatus(id: number, status: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/products/${id}/status`, { method: 'PUT', data: { status } });
}

export async function updateProductRecommend(id: number, is_recommend: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/products/${id}/recommend`, {
    method: 'PUT',
    data: { is_recommend },
  });
}

export async function listCategories() {
  return apiRequest<CategoryItem[]>('/api/v1/admin/categories', { method: 'GET' });
}

export async function createCategory(payload: Record<string, unknown>) {
  return apiRequest<{ id: number }>('/api/v1/admin/categories', { method: 'POST', data: payload });
}

export async function updateCategory(id: number, payload: Record<string, unknown>) {
  return apiRequest<{ updated: boolean }>(`/api/v1/admin/categories/${id}`, { method: 'PUT', data: payload });
}

export async function deleteCategory(id: number) {
  return apiRequest<{ deleted: boolean }>(`/api/v1/admin/categories/${id}`, { method: 'DELETE' });
}

export async function listOrders(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return apiRequest<PaginatedData<OrderItem>>(`/api/v1/admin/orders?${query.toString()}`, { method: 'GET' });
}

export function exportOrders(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return `/api/v1/admin/orders/export?${query.toString()}`;
}

export async function updateSettlement(id: number, settlement_status: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/orders/${id}/settlement`, {
    method: 'PUT',
    data: { settlement_status },
  });
}

export async function listBanners(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return apiRequest<PaginatedData<BannerItem>>(`/api/v1/admin/banners?${query.toString()}`, { method: 'GET' });
}

export async function createBanner(payload: Record<string, unknown>) {
  return apiRequest<{ id: number }>('/api/v1/admin/banners', { method: 'POST', data: payload });
}

export async function updateBanner(id: number, payload: Record<string, unknown>) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/banners/${id}`, { method: 'PUT', data: payload });
}

export async function deleteBanner(id: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/banners/${id}`, { method: 'DELETE' });
}

export async function listConfigs() {
  return apiRequest<{ list: ConfigItem[] }>('/api/v1/admin/configs', { method: 'GET' });
}

export async function updateConfig(key: string, config_value: string) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/configs/${key}`, {
    method: 'PUT',
    data: { config_value },
  });
}
