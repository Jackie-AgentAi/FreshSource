import { Tag } from 'antd';

import type { StatusMeta } from '@/constants/status';

type StatusTagProps = {
  meta?: StatusMeta;
};

export function StatusTag({ meta }: StatusTagProps) {
  return <Tag color={meta?.color || 'default'}>{meta?.label || '-'}</Tag>;
}
