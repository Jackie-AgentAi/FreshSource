import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BusinessError } from '@/api/client';
import {
  cancelBuyerOrder,
  deleteBuyerOrder,
  fetchBuyerOrderDetail,
  receiveBuyerOrder,
  reorderBuyerOrder,
} from '@/api/buyerOrder';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { getOrderStatusTag } from '@/constants/order';
import type { BuyerOrderDetail } from '@/types/order';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';
import { showToast } from '@/utils/toast';

function formatDate(value: string): string {
  return value.replace('T', ' ').slice(0, 16);
}

function deliveryTypeLabel(value: number): string {
  return value === 2 ? '到店自提' : '商家配送';
}

export function BuyerOrderDetailScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<BuyerOrderDetail | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setError('无效订单');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await fetchBuyerOrderDetail(orderId);
      setDetail(result);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const runAction = useCallback(
    async (action: () => Promise<void>, successMessage: string, backAfter = false) => {
      try {
        setSubmitting(true);
        await action();
        showToast(successMessage);
        if (backAfter) {
          router.back();
          return;
        }
        await load();
      } catch (e) {
        if (e instanceof BusinessError && e.code === 40002) {
          showToast('当前状态不允许该操作（40002）');
          return;
        }
        showToast(e instanceof Error ? e.message : '操作失败');
      } finally {
        setSubmitting(false);
      }
    },
    [load],
  );

  const actionButtons = useMemo(() => {
    if (!detail) {
      return [];
    }

    const actions: Array<{
      key: string;
      label: string;
      primary?: boolean;
      danger?: boolean;
      onPress: () => void;
    }> = [];

    if (detail.status === 0) {
      actions.push({
        key: 'cancel',
        label: '取消订单',
        danger: true,
        onPress: () => {
          Alert.alert('取消订单', '确认取消该订单？', [
            { text: '取消', style: 'cancel' },
            {
              text: '确认',
              onPress: () => {
                void runAction(() => cancelBuyerOrder(detail.id), '已取消订单');
              },
            },
          ]);
        },
      });
    }

    if (detail.status === 3) {
      actions.push({
        key: 'receive',
        label: '确认收货',
        primary: true,
        onPress: () => {
          void runAction(() => receiveBuyerOrder(detail.id), '已确认收货');
        },
      });
    }

    actions.push({
      key: 'reorder',
      label: '再来一单',
      primary: detail.status !== 3,
      onPress: () => {
        void runAction(() => reorderBuyerOrder(detail.id), '已重新加入购物车');
      },
    });

    if (detail.status === 4) {
      actions.push({
        key: 'review',
        label: '去评价',
        onPress: () => showToast('评价页后续继续接入'),
      });
    }

    if (detail.status === 4 || detail.status === 5) {
      actions.push({
        key: 'delete',
        label: '删除订单',
        onPress: () => {
          Alert.alert('删除订单', '仅从列表隐藏，确认继续？', [
            { text: '取消', style: 'cancel' },
            {
              text: '删除',
              style: 'destructive',
              onPress: () => {
                void runAction(() => deleteBuyerOrder(detail.id), '已删除', true);
              },
            },
          ]);
        },
      });
    }

    return actions;
  }, [detail, runAction]);

  if (loading && !detail) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (error && !detail) {
    return (
      <PageContainer>
        <ErrorRetryView message={error} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  if (!detail) {
    return (
      <PageContainer>
        <ErrorRetryView message="订单不存在" onRetry={() => void load()} />
      </PageContainer>
    );
  }

  const statusTag = getOrderStatusTag(detail.status);

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>订单详情</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>订单状态</Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: statusTag.bgColor, borderColor: statusTag.borderColor },
              ]}
            >
              <Text style={[styles.statusPillText, { color: statusTag.textColor }]}>
                {statusTag.label}
              </Text>
            </View>
          </View>
          <Text style={styles.orderNo}>{detail.order_no}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMeta}>下单时间 {formatDate(detail.created_at)}</Text>
            <Text style={styles.heroMeta}>{deliveryTypeLabel(detail.delivery_type)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>收货信息</Text>
          <View style={styles.addressHeader}>
            <Ionicons color="#18A84A" name="location-outline" size={22} />
            <Text style={styles.addressName}>
              {detail.receiver_name} {detail.receiver_phone}
            </Text>
          </View>
          <Text style={styles.addressText}>{detail.receiver_address}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>商品清单</Text>
            <Text style={styles.sectionMeta}>{detail.shop_name || `店铺 #${detail.shop_id}`}</Text>
          </View>
          {detail.items.map((item, index) => {
            const imageUri = resolveMediaUrl(item.product_image);
            return (
              <View
                key={`${item.product_id}-${item.sku_id ?? 0}`}
                style={[styles.itemRow, index === detail.items.length - 1 && styles.itemRowLast]}
              >
                {imageUri ? (
                  <Image resizeMode="cover" source={{ uri: imageUri }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePlaceholder]} />
                )}
                <View style={styles.itemBody}>
                  <Text numberOfLines={2} style={styles.itemName}>
                    {item.product_name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    ¥{item.price} × {item.quantity}
                    {item.unit}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>¥{item.subtotal}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>金额明细</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>商品金额</Text>
            <Text style={styles.amountValue}>¥{detail.total_amount}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>配送费</Text>
            <Text style={styles.amountValue}>¥{detail.freight_amount}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>优惠金额</Text>
            <Text style={styles.amountValue}>¥{detail.discount_amount}</Text>
          </View>
          <View style={[styles.amountRow, styles.amountRowStrong]}>
            <Text style={styles.amountStrongLabel}>实付金额</Text>
            <Text style={styles.amountStrongValue}>¥{detail.pay_amount}</Text>
          </View>
        </View>

        {detail.buyer_remark ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>买家备注</Text>
            <Text style={styles.noteText}>{detail.buyer_remark}</Text>
          </View>
        ) : null}

        {detail.cancel_reason ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>取消原因</Text>
            <Text style={styles.noteText}>{detail.cancel_reason}</Text>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {actionButtons.length > 0 ? (
        <View style={styles.actionBar}>
          {actionButtons.map((action) => (
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              key={action.key}
              onPress={action.onPress}
              style={[
                styles.actionButton,
                action.primary && styles.actionButtonPrimary,
                action.danger && styles.actionButtonDanger,
                submitting && styles.actionButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  action.primary && styles.actionButtonTextPrimary,
                  action.danger && styles.actionButtonTextDanger,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    color: colors.textStrong,
    fontWeight: '800',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  heroCard: {
    borderRadius: radius.xl,
    backgroundColor: '#18A84A',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: '#D8F5E2',
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusPillText: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  orderNo: {
    marginTop: spacing.md,
    color: colors.surface,
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    fontWeight: '800',
  },
  heroMetaRow: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    marginBottom: spacing.md,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addressName: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '700',
  },
  addressText: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceDisabled,
  },
  itemImagePlaceholder: {
    backgroundColor: colors.surfaceDisabled,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    color: colors.textStrong,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  itemMeta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  itemPrice: {
    color: colors.textStrong,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  amountRowStrong: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginBottom: 0,
  },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  amountValue: {
    color: colors.textStrong,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
  amountStrongLabel: {
    color: colors.textStrong,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '700',
  },
  amountStrongValue: {
    color: '#18A84A',
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    fontWeight: '800',
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  bottomSpacer: {
    height: 12,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#18A84A',
    borderColor: '#18A84A',
  },
  actionButtonDanger: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFF7E8',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.textStrong,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: colors.surface,
  },
  actionButtonTextDanger: {
    color: '#B7791F',
  },
});
