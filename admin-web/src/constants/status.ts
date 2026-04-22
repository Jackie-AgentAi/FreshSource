export type StatusMeta = {
  label: string;
  color?: string;
};

export const USER_ROLE = {
  BUYER: 1,
  SELLER: 2,
  ADMIN: 3,
} as const;

export const USER_STATUS = {
  DISABLED: 0,
  ENABLED: 1,
} as const;

export const SHOP_AUDIT_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;

export const SHOP_STATUS = {
  CLOSED: 0,
  OPEN: 1,
} as const;

export const PRODUCT_STATUS = {
  OFFLINE: 0,
  ONLINE: 1,
  PENDING_REVIEW: 2,
} as const;

export const PRODUCT_RECOMMEND_STATUS = {
  NORMAL: 0,
  RECOMMENDED: 1,
} as const;

export const ORDER_STATUS = {
  PENDING_CONFIRM: 0,
  PENDING_SHIP: 1,
  DELIVERING: 2,
  DELIVERED: 3,
  COMPLETED: 4,
  CANCELLED: 5,
  RETURNING: 6,
  RETURNED: 7,
} as const;

export const SETTLEMENT_STATUS = {
  PENDING: 0,
  VERIFIED: 1,
} as const;

export const CATEGORY_STATUS = {
  DISABLED: 0,
  ENABLED: 1,
} as const;

export const BANNER_STATUS = {
  HIDDEN: 0,
  VISIBLE: 1,
} as const;

export const BANNER_LINK_TYPE = {
  NONE: 0,
  PRODUCT: 1,
  SHOP: 2,
  URL: 3,
} as const;

export const USER_ROLE_META: Record<number, StatusMeta> = {
  1: { label: '买家', color: 'blue' },
  2: { label: '卖家', color: 'green' },
  3: { label: '管理员', color: 'gold' },
};

export const USER_STATUS_META: Record<number, StatusMeta> = {
  0: { label: '禁用', color: 'red' },
  1: { label: '启用', color: 'green' },
};

export const SHOP_AUDIT_META: Record<number, StatusMeta> = {
  0: { label: '待审核', color: 'gold' },
  1: { label: '审核通过', color: 'green' },
  2: { label: '审核拒绝', color: 'red' },
};

export const SHOP_STATUS_META: Record<number, StatusMeta> = {
  0: { label: '已关店', color: 'red' },
  1: { label: '营业中', color: 'green' },
};

export const PRODUCT_STATUS_META: Record<number, StatusMeta> = {
  0: { label: '下架', color: 'red' },
  1: { label: '上架', color: 'green' },
  2: { label: '审核中', color: 'gold' },
};

export const PRODUCT_RECOMMEND_META: Record<number, StatusMeta> = {
  0: { label: '普通', color: 'default' },
  1: { label: '推荐', color: 'blue' },
};

export const ORDER_STATUS_META: Record<number, StatusMeta> = {
  0: { label: '待确认', color: 'gold' },
  1: { label: '待发货', color: 'blue' },
  2: { label: '配送中', color: 'cyan' },
  3: { label: '已送达', color: 'green' },
  4: { label: '已完成', color: 'default' },
  5: { label: '已取消', color: 'red' },
  6: { label: '退货中', color: 'orange' },
  7: { label: '已退货', color: 'purple' },
};

export const SETTLEMENT_STATUS_META: Record<number, StatusMeta> = {
  0: { label: '未核对', color: 'default' },
  1: { label: '已核对', color: 'green' },
};
