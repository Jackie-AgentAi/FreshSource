export interface UserAddress {
  id: number;
  user_id: number;
  contact_name: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  detail_address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: number;
  tag: string;
}

export interface SaveAddressPayload {
  contact_name: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  detail_address: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: number;
  tag?: string;
}
