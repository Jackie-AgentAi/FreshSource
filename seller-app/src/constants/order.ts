export const SELLER_ORDER_STATUS_LABEL: Record<number, string> = {
  0: '待确认',
  1: '已接单',
  2: '配送中',
  3: '已送达',
  4: '已完成',
  5: '已取消',
  6: '退货中',
  7: '已退货',
};

export function sellerOrderStatusLabel(status: number): string {
  return SELLER_ORDER_STATUS_LABEL[status] || `状态${status}`;
}
