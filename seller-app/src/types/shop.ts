export interface SellerShopAuditStatus {
  shop_id: number;
  shop_name: string;
  logo?: string;
  description?: string;
  contact_phone?: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  audit_status: number;
  audit_remark: string;
  status: number;
  business_license: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type SellerShopDetail = SellerShopAuditStatus;

export interface SellerShopFormPayload {
  shop_name: string;
  logo: string;
  description: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  business_license: string;
  latitude?: number | null;
  longitude?: number | null;
}
