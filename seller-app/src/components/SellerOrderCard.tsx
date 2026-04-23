import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SellerStatusBadge } from '@/components/SellerStatusBadge';
import { sellerOrderStatusLabel } from '@/constants/order';
import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';
import type { SellerOrderListItem } from '@/types/order';
import { formatCompactDate, formatCurrency } from '@/utils/seller';

export function SellerOrderCard({
  item,
  urgent,
  onPress,
}: {
  item: SellerOrderListItem;
  urgent: boolean;
  onPress: () => void;
}) {
  const statusLabel = sellerOrderStatusLabel(item.status);

  return (
    <Pressable style={({ pressed }) => [styles.card, urgent ? styles.cardUrgent : null, pressed ? styles.cardPressed : null]} onPress={onPress}>
      {urgent ? (
        <View style={styles.warningBar}>
          <Ionicons name="alert-circle" size={15} color="#FFFFFF" />
          <Text style={styles.warningText}>超过 30 分钟未处理，请优先确认</Text>
        </View>
      ) : null}

      <View style={styles.topRow}>
        <View style={styles.topMeta}>
          <Ionicons name="time-outline" size={14} color={sellerColors.muted} />
          <Text style={styles.time}>{formatCompactDate(item.created_at)}</Text>
          <Text style={styles.orderNo} numberOfLines={1}>
            #{item.order_no}
          </Text>
        </View>
        <SellerStatusBadge label={statusLabel} />
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountBlock}>
          <Text style={[styles.amount, urgent ? styles.amountUrgent : null]}>{formatCurrency(item.pay_amount)}</Text>
          <Text style={styles.amountHint}>{item.item_count} 件商品</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={sellerColors.muted} />
      </View>

      <Text style={styles.receiver}>{item.receiver_name} {item.receiver_phone}</Text>
      <Text style={styles.address} numberOfLines={2}>
        {item.receiver_address}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>买家 ID：{item.buyer_id}</Text>
        <Text style={[styles.footerAction, urgent ? styles.footerActionUrgent : null]}>
          {item.status === 0 ? '立即处理' : '查看详情'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    overflow: 'hidden',
    marginBottom: 12,
    ...sellerShadow,
  },
  cardUrgent: {
    borderColor: '#FFD8BF',
  },
  cardPressed: {
    opacity: 0.95,
  },
  warningBar: {
    backgroundColor: sellerColors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: sellerColors.foreground,
  },
  orderNo: {
    flex: 1,
    fontSize: 12,
    color: sellerColors.muted,
  },
  amountRow: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountBlock: {
    flex: 1,
  },
  amount: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: sellerColors.primary,
  },
  amountUrgent: {
    color: sellerColors.orange,
  },
  amountHint: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
    fontWeight: '600',
  },
  receiver: {
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  address: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#666666',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: sellerColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FCFCFC',
  },
  footerText: {
    fontSize: 12,
    color: sellerColors.muted,
  },
  footerAction: {
    fontSize: 12,
    color: sellerColors.primary,
    fontWeight: '700',
  },
  footerActionUrgent: {
    color: sellerColors.orange,
  },
});
