import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchAddresses } from '@/api/address';
import { createBuyerOrders, confirmBuyerOrder } from '@/api/buyerOrder';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { DEFAULT_DELIVERY_TYPE } from '@/constants/checkout';
import { useCheckoutDraftStore } from '@/store/checkoutDraft';
import type { OrderConfirmResult } from '@/types/order';
import type { UserAddress } from '@/types/address';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatAddressLine } from '@/utils/address';

export default function CheckoutScreen() {
  const cartItemIds = useCheckoutDraftStore((s) => s.cartItemIds);
  const addressId = useCheckoutDraftStore((s) => s.addressId);
  const setAddressId = useCheckoutDraftStore((s) => s.setAddressId);
  const resetDraft = useCheckoutDraftStore((s) => s.reset);

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [preview, setPreview] = useState<OrderConfirmResult | null>(null);
  const [remark, setRemark] = useState('');
  const [debouncedRemark, setDebouncedRemark] = useState('');
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedAddress = addresses.find((a) => a.id === addressId) || null;

  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddr(true);
      const list = await fetchAddresses();
      setAddresses(list);
      const current = useCheckoutDraftStore.getState().addressId;
      if (current == null || !list.some((a) => a.id === current)) {
        const def = list.find((a) => a.is_default === 1) || list[0];
        setAddressId(def ? def.id : null);
      }
    } catch (e) {
      Alert.alert('提示', e instanceof Error ? e.message : '地址加载失败');
    } finally {
      setLoadingAddr(false);
    }
  }, [setAddressId]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRemark(remark), 450);
    return () => clearTimeout(t);
  }, [remark]);

  const runConfirm = useCallback(async () => {
    if (!addressId || cartItemIds.length === 0) {
      setPreview(null);
      return;
    }
    try {
      setLoadingPreview(true);
      setPreviewError('');
      const res = await confirmBuyerOrder({
        address_id: addressId,
        delivery_type: DEFAULT_DELIVERY_TYPE,
        cart_item_ids: cartItemIds,
        buyer_remark: debouncedRemark,
      });
      setPreview(res);
    } catch (e) {
      setPreview(null);
      setPreviewError(e instanceof Error ? e.message : '预览失败');
    } finally {
      setLoadingPreview(false);
    }
  }, [addressId, cartItemIds, debouncedRemark]);

  useEffect(() => {
    void runConfirm();
  }, [runConfirm]);

  const submit = () => {
    if (!addressId || cartItemIds.length === 0) {
      Alert.alert('提示', '请选择地址并确保有结算商品');
      return;
    }
    void (async () => {
      try {
        setSubmitting(true);
        const res = await createBuyerOrders({
          address_id: addressId,
          delivery_type: DEFAULT_DELIVERY_TYPE,
          cart_item_ids: cartItemIds,
          buyer_remark: remark,
        });
        resetDraft();
        Alert.alert('下单成功', `已生成订单（ID）：${res.order_ids.join(', ')}`, [
          {
            text: '好的',
            onPress: () => router.replace('/(tabs)/cart'),
          },
        ]);
      } catch (e) {
        Alert.alert('下单失败', e instanceof Error ? e.message : '请稍后重试');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  if (cartItemIds.length === 0) {
    return (
      <PageContainer>
        <EmptyState title="没有待结算商品" description="请先在购物车选择商品" />
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>返回购物车</Text>
        </Pressable>
      </PageContainer>
    );
  }

  if (loadingAddr) {
    return (
      <PageContainer>
        <LoadingView message="加载地址…" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>收货地址</Text>
        <Pressable
          style={styles.addrCard}
          onPress={() => router.push('/addresses?pick=1')}
          accessibilityRole="button"
        >
          <View style={styles.addrTextCol}>
            {selectedAddress ? (
              <>
                <Text style={styles.addrName}>
                  {selectedAddress.contact_name} {selectedAddress.contact_phone}
                </Text>
                <Text style={styles.addrDetail}>{formatAddressLine(selectedAddress)}</Text>
              </>
            ) : (
              <Text style={styles.addrPlaceholder}>请选择收货地址</Text>
            )}
          </View>
          <Text style={styles.addrChevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>备注（可选）</Text>
        <TextInput
          style={styles.remark}
          placeholder="给卖家留言"
          placeholderTextColor={colors.textMuted}
          value={remark}
          onChangeText={setRemark}
          multiline
        />

        {loadingPreview ? (
          <LoadingView message="计算金额…" />
        ) : previewError ? (
          <ErrorRetryView message={previewError} onRetry={() => void runConfirm()} />
        ) : preview ? (
          <>
            <Text style={styles.sectionLabel}>拆单预览</Text>
            {preview.groups.map((g) => (
              <View key={g.shop_id} style={styles.groupCard}>
                <Text style={styles.shopName}>{g.shop_name}</Text>
                {g.items.map((line) => (
                  <View key={`${g.shop_id}-${line.product_id}`} style={styles.lineRow}>
                    <Text style={styles.lineName} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Text style={styles.lineMeta}>
                      ¥{line.price} × {line.quantity}
                    </Text>
                  </View>
                ))}
                <Text style={styles.groupSum}>商品小计 ¥{g.total_amount}</Text>
                <Text style={styles.groupSum}>运费 ¥{g.freight_amount}</Text>
                <Text style={styles.groupPay}>应付 ¥{g.pay_amount}</Text>
              </View>
            ))}
            <View style={styles.totalBar}>
              <Text style={styles.totalLabel}>合计应付</Text>
              <Text style={styles.totalValue}>¥{preview.total_pay_amount}</Text>
            </View>
          </>
        ) : null}

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          disabled={submitting || !preview}
          onPress={submit}
        >
          <Text style={styles.submitText}>{submitting ? '提交中…' : '提交订单'}</Text>
        </Pressable>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  sectionLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  addrTextCol: {
    flex: 1,
  },
  addrName: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  addrDetail: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  addrPlaceholder: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  addrChevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  remark: {
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  shopName: {
    fontSize: typography.title,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  lineName: {
    flex: 1,
    fontSize: typography.caption,
    color: colors.text,
  },
  lineMeta: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  groupSum: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  groupPay: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  totalLabel: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  submitBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.body,
  },
  backBtn: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  backBtnText: {
    color: colors.surface,
    fontWeight: '600',
  },
});
