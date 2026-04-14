import type { UserAddress } from '@/types/address';

/** 兼容后端 `model.UserAddress` 无 json tag 时 Go 默认 PascalCase 序列化 */
export function normalizeUserAddress(raw: Record<string, unknown>): UserAddress {
  const num = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const nullableNum = (v: unknown): number | null => {
    if (v == null) {
      return null;
    }
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    id: num(raw.id ?? raw.ID),
    user_id: num(raw.user_id ?? raw.UserID),
    contact_name: str(raw.contact_name ?? raw.ContactName),
    contact_phone: str(raw.contact_phone ?? raw.ContactPhone),
    province: str(raw.province ?? raw.Province),
    city: str(raw.city ?? raw.City),
    district: str(raw.district ?? raw.District),
    detail_address: str(raw.detail_address ?? raw.DetailAddress),
    latitude: nullableNum(raw.latitude ?? raw.Latitude),
    longitude: nullableNum(raw.longitude ?? raw.Longitude),
    is_default: num(raw.is_default ?? raw.IsDefault),
    tag: str(raw.tag ?? raw.Tag),
  };
}

export function formatAddressLine(a: UserAddress): string {
  return `${a.province}${a.city}${a.district}${a.detail_address}`;
}
