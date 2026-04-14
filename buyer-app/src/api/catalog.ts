import { client } from '@/api/client';
import { unwrapApiData } from '@/api/envelope';
import type { ApiEnvelope, PaginatedList } from '@/types/api';
import type {
  BuyerProductDetail,
  BuyerProductItem,
  BuyerShopHomepage,
  CategoryTreeNode,
} from '@/types/catalog';

export async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  const { data } = await client.get<ApiEnvelope<CategoryTreeNode[]>>('/api/v1/buyer/categories');
  return unwrapApiData(data);
}

export async function fetchBuyerProducts(params: {
  category_id?: number;
  shop_id?: number;
  keyword?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedList<BuyerProductItem>> {
  const { data } = await client.get<ApiEnvelope<PaginatedList<BuyerProductItem>>>(
    '/api/v1/buyer/products',
    { params },
  );
  return unwrapApiData(data);
}

export async function searchBuyerProducts(params: {
  keyword: string;
  category_id?: number;
  shop_id?: number;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedList<BuyerProductItem>> {
  const { data } = await client.get<ApiEnvelope<PaginatedList<BuyerProductItem>>>(
    '/api/v1/buyer/products/search',
    { params },
  );
  return unwrapApiData(data);
}

export async function fetchProductDetail(id: number): Promise<BuyerProductDetail> {
  const { data } = await client.get<ApiEnvelope<BuyerProductDetail>>(`/api/v1/buyer/products/${id}`);
  return unwrapApiData(data);
}

export async function fetchShopHomepage(
  shopId: number,
  page = 1,
  pageSize = 20,
): Promise<BuyerShopHomepage> {
  const { data } = await client.get<ApiEnvelope<BuyerShopHomepage>>(
    `/api/v1/buyer/shops/${shopId}`,
    { params: { page, page_size: pageSize } },
  );
  return unwrapApiData(data);
}
