import { unwrapApiData } from '@/api/envelope';
import { client } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { SaveAddressPayload, UserAddress } from '@/types/address';
import { normalizeUserAddress } from '@/utils/address';

export async function fetchAddresses(): Promise<UserAddress[]> {
  const { data } = await client.get<ApiEnvelope<unknown[]>>('/api/v1/buyer/addresses');
  const list = unwrapApiData(data);
  return (list as Record<string, unknown>[]).map((row) => normalizeUserAddress(row));
}

export async function createAddress(payload: SaveAddressPayload): Promise<UserAddress> {
  const { data } = await client.post<ApiEnvelope<unknown>>('/api/v1/buyer/addresses', payload);
  const row = unwrapApiData(data) as Record<string, unknown>;
  return normalizeUserAddress(row);
}

export async function updateAddress(id: number, payload: SaveAddressPayload): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ updated?: boolean }>>(
    `/api/v1/buyer/addresses/${id}`,
    payload,
  );
  unwrapApiData(data);
}

export async function deleteAddress(id: number): Promise<void> {
  const { data } = await client.delete<ApiEnvelope<{ deleted?: boolean }>>(
    `/api/v1/buyer/addresses/${id}`,
  );
  unwrapApiData(data);
}

export async function setDefaultAddress(id: number): Promise<void> {
  const { data } = await client.put<ApiEnvelope<{ updated?: boolean }>>(
    `/api/v1/buyer/addresses/${id}/default`,
    {},
  );
  unwrapApiData(data);
}
