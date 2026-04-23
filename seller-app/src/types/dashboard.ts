export type SellerDashboardRange = 'day' | 'week' | 'month';

export interface SellerDashboardSummary {
  revenue: string;
  order_count: number;
  average_order_value: string;
  revenue_growth_rate: string;
  order_growth_rate: string;
}

export interface SellerDashboardFulfillment {
  pending_orders: number;
  delivering_orders: number;
  arrived_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_orders: number;
}

export interface SellerDashboardProductStats {
  on_sale_count: number;
  pending_audit_count: number;
  warehouse_count: number;
  low_stock_count: number;
}

export interface SellerDashboardInventoryAlert {
  product_id: number;
  name: string;
  price: string;
  unit: string;
  stock: number;
}

export interface SellerDashboardMessageOverview {
  unread_count: number;
  latest_title: string;
}

export interface SellerDashboardMetrics {
  range: SellerDashboardRange;
  summary: SellerDashboardSummary;
  fulfillment: SellerDashboardFulfillment;
  product: SellerDashboardProductStats;
  inventory_alerts: SellerDashboardInventoryAlert[];
  message_overview: SellerDashboardMessageOverview;
  total_orders: number;
  pending_orders: number;
  delivering_orders: number;
  arrived_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}
