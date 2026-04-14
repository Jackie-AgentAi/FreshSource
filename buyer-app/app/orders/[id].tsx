import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
import { showToast } from '@/utils/toast';
import { resolveMediaUrl } from '@/utils/media';

export default function BuyerOrderDetailScreen() {
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
      const data = await fetchBuyerOrderDetail(orderId);
      setDetail(data);
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
    async (action: () => Promise<void>, successMessage: string, reloadOnly = true) => {
      try {
        setSubmitting(true);
        await action();
        showToast(successMessage);
        if (reloadOnly) {
          await load();
        } else {
          router.back();
        }
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

  const canCancel = detail.status === 0;
  const canReceive = detail.status === 3;
  const canDelete = detail.status === 4 || detail.status === 5;
  const canReview = detail.status === 4;
  const statusTag = getOrderStatusTag(detail.status);

  return (
    <PageContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>订单详情</Text>
        <View style={[styles.headerStatusTag, { backgroundColor: statusTag.bgColor, borderColor: statusTag.borderColor }]}>
          <Text style={[styles.headerStatusText, { color: statusTag.textColor }]}>{statusTag.label}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>订单信息</Text>
          <Text style={styles.value}>订单号：{detail.order_no}</Text>
          <Text style={styles.value}>下单时间：{detail.created_at.replace('T', ' ').slice(0, 16)}</Text>
          <Text style={styles.value}>店铺：{detail.shop_name || `店铺#${detail.shop_id}`}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>收货信息</Text>
          <Text style={styles.value}>{detail.receiver_name} {detail.receiver_phone}</Text>
          <Text style={styles.value}>{detail.receiver_address}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>商品明细</Text>
          {detail.items.map((item) => {
            const uri = resolveMediaUrl(item.product_image);
            return (
              <View key={`${item.product_id}-${item.sku_id ?? 0}`} style={styles.itemRow}>
                {uri ? (
                  <Image source={{ uri }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePh]} />
                )}
                <View style={styles.itemBody}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product_name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    ¥{item.price} × {item.quantity} {item.unit}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>¥{item.subtotal}</Text>
              </View>
            );
          })}
          <Text style={styles.sum}>商品：¥{detail.total_amount}</Text>
          <Text style={styles.sum}>运费：¥{detail.freight_amount}</Text>
          <Text style={styles.pay}>应付：¥{detail.pay_amount}</Text>
        </View>

        {detail.buyer_remark ? (
          <View style={styles.card}>
            <Text style={styles.title}>备注</Text>
            <Text style={styles.value}>{detail.buyer_remark}</Text>
          </View>
        ) : null}
        {detail.cancel_reason ? (
          <View style={styles.card}>
            <Text style={styles.title}>取消原因</Text>
            <Text style={styles.value}>{detail.cancel_reason}</Text>
          </View>
        ) : null}

        <View style={styles.actionsPlaceholder} />
      </ScrollView>
      <View style={styles.actions}>
        {canCancel ? (
          <Pressable
            style={[styles.actionBtn, styles.warnBtn, submitting && styles.disabledBtn]}
            disabled={submitting}
            onPress={() => {
              Alert.alert('取消订单', '确认取消该订单？', [
                { text: '否', style: 'cancel' },
                {
                  text: '确认',
                  onPress: () => {
                    void runAction(() => cancelBuyerOrder(detail.id), '已取消订单');
                  },
                },
              ]);
            }}
          >
            <Text style={styles.actionText}>取消订单</Text>
          </Pressable>
        ) : null}

        {canReceive ? (
          <Pressable
            style={[styles.actionBtn, submitting && styles.disabledBtn]}
            disabled={submitting}
            onPress={() => {
              void runAction(() => receiveBuyerOrder(detail.id), '已确认收货');
            }}
          >
            <Text style={styles.actionText}>确认收货</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.actionBtn, styles.secondaryBtn, submitting && styles.disabledBtn]}
          disabled={submitting}
          onPress={() => {
            void runAction(() => reorderBuyerOrder(detail.id), '已重新加入购物车');
          }}
        >
          <Text style={[styles.actionText, styles.secondaryText]}>再来一单</Text>
        </Pressable>

        {canDelete ? (
          <Pressable
            style={[styles.actionBtn, styles.secondaryBtn, submitting && styles.disabledBtn]}
            disabled={submitting}
            onPress={() => {
              Alert.alert('删除订单', '仅从列表隐藏，确认继续？', [
                { text: '取消', style: 'cancel' },
                {
                  text: '删除',
                  style: 'destructive',
                  onPress: () => {
                    void runAction(() => deleteBuyerOrder(detail.id), '已删除', false);
                  },
                },
              ]);
            }}
          >
            <Text style={[styles.actionText, styles.secondaryText]}>删除订单</Text>
          </Pressable>
        ) : null}

        {canReview ? (
          <Pressable
            style={[styles.actionBtn, submitting && styles.disabledBtn]}
            disabled={submitting}
            onPress={() => {
              router.push(`/orders/review/${detail.id}`);
            }}
          >
            <Text style={styles.actionText}>去评价</Text>
          </Pressable>
        ) : null}
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    fontWeight: '700',
    color: colors.textStrong,
  },
  headerStatusTag: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  headerStatusText: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '700',
    color: colors.textStrong,
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  itemImagePh: {
    backgroundColor: '#e5e5e5',
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textStrong,
    fontWeight: '600',
  },
  itemMeta: {
    marginTop: 2,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  itemSubtotal: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textStrong,
    fontWeight: '700',
  },
  sum: {
    textAlign: 'right',
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pay: {
    textAlign: 'right',
    marginTop: spacing.sm,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.primary,
    fontWeight: '700',
  },
  actionsPlaceholder: {
    height: 12,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBtn: {
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  warnBtn: {
    backgroundColor: '#f59e0b',
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.surface,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.textStrong,
  },
  disabledBtn: {
    opacity: 0.55,
  },
});
