export const SELLER_PRODUCT_STATUS_LABEL: Record<number, string> = {
  0: '已下架',
  1: '在售',
  2: '审核中',
};

export function sellerProductStatusLabel(status: number): string {
  return SELLER_PRODUCT_STATUS_LABEL[status] || `状态${status}`;
}
