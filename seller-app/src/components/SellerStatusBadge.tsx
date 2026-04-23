import { StyleSheet, Text, View } from 'react-native';

import { sellerColors, sellerRadius } from '@/theme/seller';

type Tone = 'default' | 'success' | 'warning' | 'info' | 'danger' | 'muted' | 'orange';

function resolveTone(label: string): Tone {
  switch (label) {
    case '已完成':
    case '在售':
    case '审核通过':
    case '营业中':
      return 'success';
    case '已接单':
    case '配送中':
      return 'info';
    case '待确认':
      return 'orange';
    case '已送达':
    case '审核中':
      return 'warning';
    case '审核拒绝':
      return 'danger';
    case '已取消':
    case '已下架':
    case '已关店':
      return 'muted';
    default:
      return 'default';
  }
}

export function SellerStatusBadge({ label }: { label: string }) {
  const tone = resolveTone(label);

  return (
    <View style={[styles.badge, badgeStyles[tone]]}>
      <Text style={[styles.text, textStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: sellerRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});

const badgeStyles = StyleSheet.create({
  default: {
    backgroundColor: sellerColors.secondary,
    borderColor: sellerColors.border,
  },
  success: {
    backgroundColor: sellerColors.successSoft,
    borderColor: '#D9F7BE',
  },
  warning: {
    backgroundColor: sellerColors.warningSoft,
    borderColor: '#FFE7BA',
  },
  info: {
    backgroundColor: sellerColors.infoSoft,
    borderColor: '#BAE0FF',
  },
  danger: {
    backgroundColor: sellerColors.destructiveSoft,
    borderColor: '#FFCCC7',
  },
  muted: {
    backgroundColor: sellerColors.secondary,
    borderColor: sellerColors.border,
  },
  orange: {
    backgroundColor: sellerColors.orangeSoft,
    borderColor: '#FFD8BF',
  },
});

const textStyles = StyleSheet.create({
  default: {
    color: sellerColors.foreground,
  },
  success: {
    color: sellerColors.success,
  },
  warning: {
    color: '#AD6800',
  },
  info: {
    color: sellerColors.info,
  },
  danger: {
    color: sellerColors.destructive,
  },
  muted: {
    color: '#666666',
  },
  orange: {
    color: sellerColors.orange,
  },
});
