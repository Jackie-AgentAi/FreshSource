import type { BannerItem, CategoryItem, ConfigItem, OrderItem, ProductItem, ShopItem, UserItem } from '@/types/admin';
import type { PaginatedData } from '@/types/http';
import { apiRequest, withQuery } from '@/utils/http';

export type { BannerItem, CategoryItem, ConfigItem, OrderItem, ProductItem, ShopItem, UserItem } from '@/types/admin';
export type { PaginatedData, Pagination } from '@/types/http';

export async function listUsers(params: Record<string, string>) {
  return apiRequest<PaginatedData<UserItem>>(withQuery('/api/v1/admin/users', params), { method: 'GET' });
}

export async function updateUserStatus(id: number, status: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/users/${id}/status`, { method: 'PUT', data: { status } });
}

export async function listShops(params: Record<string, string>) {
  return apiRequest<PaginatedData<ShopItem>>(withQuery('/api/v1/admin/shops', params), { method: 'GET' });
}

export async function getShopDetail(id: number) {
  return apiRequest<ShopItem>(`/api/v1/admin/shops/${id}`, { method: 'GET' });
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
  return apiRequest<PaginatedData<ProductItem>>(withQuery('/api/v1/admin/products', params), { method: 'GET' });
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
  return apiRequest<PaginatedData<OrderItem>>(withQuery('/api/v1/admin/orders', params), { method: 'GET' });
}

export function exportOrders(params: Record<string, string>) {
  return withQuery('/api/v1/admin/orders/export', params);
}

export async function updateSettlement(id: number, settlement_status: number) {
  return apiRequest<{ ok: boolean }>(`/api/v1/admin/orders/${id}/settlement`, {
    method: 'PUT',
    data: { settlement_status },
  });
}

export async function listBanners(params: Record<string, string>) {
  return apiRequest<PaginatedData<BannerItem>>(withQuery('/api/v1/admin/banners', params), { method: 'GET' });
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
