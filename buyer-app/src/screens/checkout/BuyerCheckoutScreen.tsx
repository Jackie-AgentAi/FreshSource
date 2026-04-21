import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchAddresses } from '@/api/address';
import { createBuyerOrders, confirmBuyerOrder } from '@/api/buyerOrder';
import { fetchProductDetail } from '@/api/catalog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { DEFAULT_DELIVERY_TYPE } from '@/constants/checkout';
import { useCheckoutDraftStore } from '@/store/checkoutDraft';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import type { UserAddress } from '@/types/address';
import type { BuyerProductDetail } from '@/types/catalog';
import type { OrderConfirmResult } from '@/types/order';
import { formatAddressLine } from '@/utils/address';
import { resolveMediaUrl } from '@/utils/media';

type DeliveryType = 1 | 2;

function maskPhone(phone: string): string {
  if (phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function BuyerCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const cartItemIds = useCheckoutDraftStore((state) => state.cartItemIds);
  const addressId = useCheckoutDraftStore((state) => state.addressId);
  const setAddressId = useCheckoutDraftStore((state) => state.setAddressId);
  const resetDraft = useCheckoutDraftStore((state) => state.reset);

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [preview, setPreview] = useState<OrderConfirmResult | null>(null);
  const [productMap, setProductMap] = useState<Record<number, BuyerProductDetail>>({});
  const [remark, setRemark] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DEFAULT_DELIVERY_TYPE as DeliveryType);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedAddress = useMemo(
    () => addresses.find((item) => item.id === addressId) ?? null,
    [addressId, addresses],
  );

  const totalAmount = useMemo(() => {
    return preview?.groups.reduce((sum, group) => sum + Number(group.total_amount), 0) ?? 0;
  }, [preview]);

  const totalFreight = useMemo(() => {
    return preview?.groups.reduce((sum, group) => sum + Number(group.freight_amount), 0) ?? 0;
  }, [preview]);

  const totalPayAmount = useMemo(() => Number(preview?.total_pay_amount ?? 0), [preview]);

  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddr(true);
      const list = await fetchAddresses();
      setAddresses(list);
      const currentAddressId = useCheckoutDraftStore.getState().addressId;
      if (currentAddressId == null || !list.some((item) => item.id === currentAddressId)) {
        const defaultAddress = list.find((item) => item.is_default === 1) ?? list[0] ?? null;
        setAddressId(defaultAddress?.id ?? null);
      }
    } catch (error) {
      Alert.alert('提示', error instanceof Error ? error.message : '地址加载失败');
    } finally {
      setLoadingAddr(false);
    }
  }, [setAddressId]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const loadPreview = useCallback(async () => {
    if (!addressId || cartItemIds.length === 0) {
      setPreview(null);
      return;
    }
    try {
      setLoadingPreview(true);
      setPreviewError('');
      const nextPreview = await confirmBuyerOrder({
        address_id: addressId,
        buyer_remark: remark,
        cart_item_ids: cartItemIds,
        delivery_type: deliveryType,
      });
      setPreview(nextPreview);
    } catch (error) {
      setPreview(null);
      setPreviewError(error instanceof Error ? error.message : '订单预览失败');
    } finally {
      setLoadingPreview(false);
    }
  }, [addressId, cartItemIds, deliveryType, remark]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (!preview) {
      return;
    }
    const ids = Array.from(new Set(preview.groups.flatMap((group) => group.items.map((item) => item.product_id))));
    void (async () => {
      const results = await Promise.allSettled(ids.map((id) => fetchProductDetail(id)));
      const nextMap: Record<number, BuyerProductDetail> = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          nextMap[ids[index]] = result.value;
        }
      });
      setProductMap(nextMap);
    })();
  }, [preview]);

  const submit = async () => {
    if (!addressId || cartItemIds.length === 0) {
      Alert.alert('提示', '请选择地址并确认商品后再提交');
      return;
    }
    try {
      setSubmitting(true);
      const result = await createBuyerOrders({
        address_id: addressId,
        buyer_remark: remark,
        cart_item_ids: cartItemIds,
        delivery_type: deliveryType,
      });
      resetDraft();
      Alert.alert('下单成功', `已生成订单 ${result.order_ids.join('、')}`, [
        {
          text: '查看订单',
          onPress: () => router.replace('/orders'),
        },
      ]);
    } catch (error) {
      Alert.alert('提交失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItemIds.length === 0) {
    return (
      <PageContainer>
        <EmptyState title="没有待结算商品" description="请先在购物车中选择商品" />
      </PageContainer>
    );
  }

  if (loadingAddr) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>确认订单</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 210 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/addresses?pick=1')} style={styles.addressCard}>
          <Ionicons color="#18A84A" name="location-outline" size={34} style={styles.addressIcon} />
          <View style={styles.addressBody}>
            {selectedAddress ? (
              <>
                <View style={styles.addressTopRow}>
                  <Text style={styles.addressName}>{selectedAddress.contact_name}</Text>
                  <Text style={styles.addressPhone}>{maskPhone(selectedAddress.contact_phone)}</Text>
                  {selectedAddress.tag ? (
                    <View style={styles.addressTag}>
                      <Text style={styles.addressTagText}>{selectedAddress.tag}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.addressText}>{formatAddressLine(selectedAddress)}</Text>
              </>
            ) : (
              <Text style={styles.addressPlaceholder}>请选择收货地址</Text>
            )}
          </View>
          <Ionicons color="#7B8597" name="chevron-forward" size={24} />
        </Pressable>

        {loadingPreview ? <LoadingView message="计算订单中..." /> : null}
        {previewError ? <ErrorRetryView message={previewError} onRetry={() => void loadPreview()} /> : null}

        {preview?.groups.map((group) => (
          <View key={group.shop_id} style={styles.groupCard}>
            <Text style={styles.shopName}>{group.shop_name}</Text>
            {group.items.map((item) => {
              const product = productMap[item.product_id];
              const imageUri = resolveMediaUrl(product?.cover_image);
              return (
                <View key={`${group.shop_id}-${item.product_id}`} style={styles.itemRow}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.itemPlaceholder]} />
                  )}
                  <View style={styles.itemBody}>
                    <Text numberOfLines={1} style={styles.itemName}>
                      {item.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.itemSubtitle}>
                      {product?.subtitle || '精选食材'}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ¥ {Number(item.price).toFixed(1)}
                      <Text style={styles.itemUnit}>/{product?.unit || '斤'}</Text>
                    </Text>
                  </View>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
              );
            })}

            <Text style={styles.groupLabel}>配送方式</Text>
            <View style={styles.deliveryRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDeliveryType(1)}
                style={[styles.deliveryButton, deliveryType === 1 && styles.deliveryButtonActive]}
              >
                <Text style={[styles.deliveryButtonText, deliveryType === 1 && styles.deliveryButtonTextActive]}>
                  商家配送
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDeliveryType(2)}
                style={[styles.deliveryButton, deliveryType === 2 && styles.deliveryButtonActive]}
              >
                <Text style={[styles.deliveryButtonText, deliveryType === 2 && styles.deliveryButtonTextActive]}>
                  到店自提
                </Text>
              </Pressable>
            </View>

            <View style={styles.groupSubtotalRow}>
              <Text style={styles.groupSubtotalLabel}>店铺小计</Text>
              <Text style={styles.groupSubtotalValue}>¥ {Number(group.pay_amount).toFixed(2)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.fixedBarPreview}>
          <View style={styles.totalTextWrap}>
            <Text style={styles.totalPreviewLabel}>合计: </Text>
            <Text style={styles.totalPreviewValue}>¥ {totalPayAmount.toFixed(2)}</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={submitting || !preview} onPress={() => void submit()} style={[styles.submitButton, (submitting || !preview) && styles.submitDisabled]}>
            <Text style={styles.submitButtonText}>{submitting ? '提交中...' : '提交订单'}</Text>
          </Pressable>
        </View>

        <TextInput
          multiline
          onChangeText={setRemark}
          placeholder="如有特殊需求，请在此留言"
          placeholderTextColor="#9CA3AF"
          style={styles.remarkInput}
          value={remark}
        />

        <View style={styles.feeCard}>
          <Text style={styles.feeTitle}>费用明细</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>商品金额</Text>
            <Text style={styles.feeValue}>¥{totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>配送费</Text>
            <Text style={styles.feeValue}>¥{totalFreight.toFixed(2)}</Text>
          </View>
          <View style={styles.feeDivider} />
          <View style={styles.feeRow}>
            <Text style={styles.feePayLabel}>实付金额</Text>
            <Text style={styles.feePayValue}>¥ {totalPayAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 88,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE8',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.textStrong,
    fontWeight: '700',
  },
  content: {
    backgroundColor: '#F3F6F3',
    paddingBottom: spacing.xl,
  },
  addressCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    minHeight: 112,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIcon: {
    marginRight: spacing.md,
  },
  addressBody: {
    flex: 1,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addressName: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  addressPhone: {
    fontSize: 22,
    lineHeight: 30,
    color: '#6B7280',
  },
  addressTag: {
    backgroundColor: '#E8F7ED',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addressTagText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: '#18A84A',
    fontWeight: '700',
  },
  addressText: {
    marginTop: spacing.sm,
    fontSize: 18,
    lineHeight: 26,
    color: '#6B7280',
  },
  addressPlaceholder: {
    fontSize: 18,
    lineHeight: 26,
    color: '#9CA3AF',
  },
  groupCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  shopName: {
    minHeight: 78,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 24,
    lineHeight: 32,
    color: colors.textStrong,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE8',
  },
  itemRow: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE8',
  },
  itemImage: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#E4EAE2',
  },
  itemPlaceholder: {
    backgroundColor: '#E4EAE2',
  },
  itemBody: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  itemName: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  itemSubtitle: {
    marginTop: spacing.xs,
    fontSize: 18,
    lineHeight: 24,
    color: '#7B8597',
  },
  itemPrice: {
    marginTop: spacing.md,
    fontSize: 20,
    lineHeight: 28,
    color: '#18A84A',
    fontWeight: '700',
  },
  itemUnit: {
    color: '#7B8597',
    fontWeight: '400',
  },
  itemQuantity: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  groupLabel: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  deliveryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  deliveryButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#DDE4DE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  deliveryButtonActive: {
    borderColor: '#18A84A',
    backgroundColor: '#F4FBF6',
  },
  deliveryButtonText: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.textStrong,
    fontWeight: '700',
  },
  deliveryButtonTextActive: {
    color: '#18A84A',
  },
  groupSubtotalRow: {
    minHeight: 86,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupSubtotalLabel: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  groupSubtotalValue: {
    fontSize: 22,
    lineHeight: 30,
    color: '#18A84A',
    fontWeight: '700',
  },
  fixedBarPreview: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    minHeight: 112,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalTextWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalPreviewLabel: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  totalPreviewValue: {
    fontSize: 24,
    lineHeight: 32,
    color: '#18A84A',
    fontWeight: '700',
  },
  submitButton: {
    width: 252,
    minHeight: 96,
    borderRadius: 28,
    backgroundColor: '#18A84A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.surface,
    fontWeight: '700',
  },
  remarkInput: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 154,
    borderRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 18,
    lineHeight: 28,
    color: colors.textStrong,
    textAlignVertical: 'top',
  },
  feeCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  feeTitle: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.textStrong,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  feeLabel: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  feeValue: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textStrong,
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#E8EDE8',
    marginBottom: spacing.lg,
  },
  feePayLabel: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  feePayValue: {
    fontSize: 24,
    lineHeight: 32,
    color: '#18A84A',
    fontWeight: '700',
  },
});
