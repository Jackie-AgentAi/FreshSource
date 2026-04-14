export interface SellerShopAuditStatus {
  shop_id: number;
  shop_name: string;
  audit_status: number;
  audit_remark: string;
  status: number;
  business_license: string;
}

export interface SellerDashboardMetrics {
  total_orders: number;
  pending_orders: number;
  delivering_orders: number;
  arrived_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}
