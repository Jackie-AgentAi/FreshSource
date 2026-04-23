import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuyerOrderListItem } from '@/types/order';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

type OrderCardAction = {
  key: string;
  label: string;
  primary?: boolean;
  onPress: () => void;
};

type OrderListCardProps = {
  item: BuyerOrderListItem;
  images: string[];
  statusLabel: string;
  statusTone: 'green' | 'amber' | 'gray' | 'red';
  onPress: () => void;
  actions: OrderCardAction[];
};

function badgeStyle(tone: OrderListCardProps['statusTone']) {
  switch (tone) {
    case 'green':
      return { bg: '#E8F7ED', text: '#18A84A' };
    case 'amber':
      return { bg: '#FFF5E8', text: '#F59E0B' };
    case 'red':
      return { bg: '#FDECEC', text: '#EF4444' };
    default:
      return { bg: '#EEF2EE', text: '#8B94A3' };
  }
}

export function OrderListCard({
  item,
  images,
  statusLabel,
  statusTone,
  onPress,
  actions,
}: OrderListCardProps) {
  const badge = badgeStyle(statusTone);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text numberOfLines={1} style={styles.shopName}>
            {item.shop_name || `店铺 #${item.shop_id}`}
          </Text>
          <Ionicons color="#7B8597" name="chevron-forward" size={22} />
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.imagesRow}>
          {images.slice(0, 2).map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.thumb} />
          ))}
          {images.length === 0 ? <View style={[styles.thumb, styles.thumbPlaceholder]} /> : null}
        </View>

        <View style={styles.metaWrap}>
          <Text style={styles.metaText}>共{item.item_count}件商品</Text>
          <Text style={styles.timeText}>{item.created_at.replace('T', ' ').slice(0, 16)}</Text>
        </View>

        <Text style={styles.amountText}>
          合计: <Text style={styles.amountStrong}>¥ {Number(item.pay_amount).toFixed(2)}</Text>
        </Text>
      </View>

      {actions.length > 0 ? (
        <View style={styles.actionsRow}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              onPress={action.onPress}
              style={[
                styles.actionButton,
                actions.length > 1 && styles.actionButtonFlex,
                action.primary && styles.actionPrimaryButton,
              ]}
            >
              <Text style={[styles.actionText, action.primary && styles.actionPrimaryText]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E5EAE4',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  header: {
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE8',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textStrong,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  badge: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: radius.lg,
    backgroundColor: '#E4EAE2',
  },
  thumbPlaceholder: {
    backgroundColor: '#E4EAE2',
  },
  metaWrap: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  timeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
  amountText: {
    marginTop: spacing.md,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  amountStrong: {
    color: colors.primary,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  actionButton: {
    minWidth: 92,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E1E7E0',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonFlex: {
    flex: 1,
    minWidth: 0,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textStrong,
    fontWeight: '700',
  },
  actionPrimaryText: {
    color: colors.surface,
  },
});
