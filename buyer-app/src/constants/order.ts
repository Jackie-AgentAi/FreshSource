export const ORDER_STATUS_LABEL: Record<number, string> = {
  0: '待确认',
  1: '已接单',
  2: '配送中',
  3: '已送达',
  4: '已完成',
  5: '已取消',
  6: '退货中',
  7: '已退货',
};

export type OrderStatusTag = {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
};

const DEFAULT_TAG: OrderStatusTag = {
  label: '未知状态',
  textColor: '#374151',
  bgColor: '#f3f4f6',
  borderColor: '#d1d5db',
};

export const ORDER_STATUS_TAG_MAP: Record<number, OrderStatusTag> = {
  0: { label: '待确认', textColor: '#ad6800', bgColor: '#fff7e6', borderColor: '#ffd591' },
  1: { label: '已接单', textColor: '#096dd9', bgColor: '#e6f4ff', borderColor: '#91caff' },
  2: { label: '配送中', textColor: '#7c3aed', bgColor: '#f5f3ff', borderColor: '#c4b5fd' },
  3: { label: '已送达', textColor: '#389e0d', bgColor: '#f6ffed', borderColor: '#b7eb8f' },
  4: { label: '已完成', textColor: '#15803d', bgColor: '#dcfce7', borderColor: '#86efac' },
  5: { label: '已取消', textColor: '#cf1322', bgColor: '#fff1f0', borderColor: '#ffa39e' },
  6: { label: '退货中', textColor: '#b45309', bgColor: '#fffbeb', borderColor: '#fcd34d' },
  7: { label: '已退货', textColor: '#6b7280', bgColor: '#f3f4f6', borderColor: '#d1d5db' },
};

export const BUYER_ORDER_FILTERS = [
  { key: 'all', label: '全部', value: undefined as number | undefined },
  { key: '0', label: ORDER_STATUS_LABEL[0], value: 0 },
  { key: '3', label: ORDER_STATUS_LABEL[3], value: 3 },
  { key: '4', label: ORDER_STATUS_LABEL[4], value: 4 },
  { key: '5', label: ORDER_STATUS_LABEL[5], value: 5 },
];

export function orderStatusLabel(status: number): string {
  return ORDER_STATUS_LABEL[status] || `状态${status}`;
}

export function getOrderStatusTag(status: number): OrderStatusTag {
  if (ORDER_STATUS_TAG_MAP[status]) {
    return ORDER_STATUS_TAG_MAP[status];
  }
  return {
    ...DEFAULT_TAG,
    label: `状态${status}`,
  };
}
