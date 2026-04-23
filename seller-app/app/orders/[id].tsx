import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SellerStatusBadge } from '@/components/SellerStatusBadge';
import {
  arrivedSellerOrder,
  confirmSellerOrder,
  deliverSellerOrder,
  fetchSellerOrderDetail,
  rejectSellerOrder,
  updateSellerOrderRemark,
} from '@/api/order';
import { sellerOrderStatusLabel } from '@/constants/order';
import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';
import type { SellerOrderDetail } from '@/types/order';
import { resolveMediaUrl } from '@/utils/media';
import { formatCompactDate, formatCurrency } from '@/utils/seller';

function actionHintByStatus(status: number): string {
  if (status === 0) return '可执行：接单 / 拒单';
  if (status === 1) return '可执行：发货';
  if (status === 2) return '可执行：送达';
  return '当前状态无履约动作';
}

export default function SellerOrderDetailPage() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<SellerOrderDetail | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [remarkDraft, setRemarkDraft] = useState('');

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setError('无效订单 ID');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await fetchSellerOrderDetail(orderId);
      setDetail(data);
      setRemarkDraft(data.seller_remark || '');
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
    navigation.setOptions({ title: '订单详情' });
  }, [navigation]);

  const runAction = (act: () => Promise<void>, success: string) => {
    void (async () => {
      try {
        setActing(true);
        await act();
        Alert.alert('成功', success);
        await load();
      } catch (e) {
        Alert.alert('失败', e instanceof Error ? e.message : '操作失败');
      } finally {
        setActing(false);
      }
    })();
  };

  if (loading && !detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.gray}>加载中...</Text>
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.link} onPress={() => void load()}>
          点此重试
        </Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.gray}>订单不存在</Text>
      </View>
    );
  }

  const canConfirm = detail.status === 0;
  const canReject = detail.status === 0;
  const canDeliver = detail.status === 1;
  const canArrived = detail.status === 2;
  const statusLabel = sellerOrderStatusLabel(detail.status);
  const orderAmount = formatCurrency(detail.pay_amount);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {detail.status === 0 ? (
        <View style={styles.urgentBar}>
          <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
          <View style={styles.urgentBody}>
            <Text style={styles.urgentTitle}>待确认订单</Text>
            <Text style={styles.urgentText}>请尽快确认或拒绝，避免系统超时取消。</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.heroCard, detail.status === 0 ? styles.heroCardPending : null]}>
        <View style={styles.heroTopRow}>
          <SellerStatusBadge label={statusLabel} />
          <Text style={styles.heroDate}>{formatCompactDate(detail.created_at)}</Text>
        </View>
        <Text style={[styles.heroAmount, detail.status === 0 ? styles.heroAmountPending : null]}>{orderAmount}</Text>
        <Text style={styles.heroOrderNo}>订单号：{detail.order_no}</Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Ionicons name="person-outline" size={14} color={sellerColors.muted} />
            <Text style={styles.heroMetaText}>买家 ID {detail.buyer_id}</Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Ionicons name="cube-outline" size={14} color={sellerColors.muted} />
            <Text style={styles.heroMetaText}>{detail.items.length} 件商品</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>履约动作</Text>
        <Text style={styles.meta}>{actionHintByStatus(detail.status)}</Text>
        <Text style={styles.subtle}>确认、发货、送达动作必须遵守当前订单状态机。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>收货信息</Text>
        <View style={styles.contactRow}>
          <View style={styles.contactMain}>
            <Text style={styles.metaStrong}>{detail.receiver_name} {detail.receiver_phone}</Text>
            <Text style={styles.metaAddress}>{detail.receiver_address}</Text>
          </View>
          <Pressable
            style={styles.callBtn}
            onPress={() => {
              void Linking.openURL(`tel:${detail.receiver_phone}`);
            }}
          >
            <Ionicons name="call-outline" size={16} color={sellerColors.primary} />
            <Text style={styles.callBtnText}>联系</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>商品明细</Text>
        {detail.items.map((item) => {
          const uri = resolveMediaUrl(item.product_image);
          return (
            <View key={`${item.product_id}-${item.sku_id ?? 0}`} style={styles.itemRow}>
              {uri ? <Image source={{ uri }} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbPh]} />}
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                <Text style={styles.itemMeta}>{formatCurrency(item.price)} × {item.quantity} {item.unit}</Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          );
        })}
        <View style={styles.amountSummary}>
          <Text style={styles.sum}>商品：{formatCurrency(detail.total_amount)}</Text>
          <Text style={styles.sum}>运费：{formatCurrency(detail.freight_amount)}</Text>
          <Text style={styles.pay}>应收：{formatCurrency(detail.pay_amount)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>卖家备注</Text>
        <TextInput
          style={styles.input}
          value={remarkDraft}
          onChangeText={setRemarkDraft}
          placeholder="内部备注（最长 255）"
          multiline
        />
        <Pressable
          style={[styles.inlineActionBtn, acting && styles.disabled]}
          disabled={acting}
          onPress={() => runAction(() => updateSellerOrderRemark(detail.id, remarkDraft), '备注已更新')}
        >
          <Text style={styles.inlineActionText}>保存备注</Text>
        </Pressable>
      </View>

      {canReject ? (
        <View style={styles.card}>
          <Text style={styles.title}>拒单原因</Text>
          <View style={styles.reasonChips}>
            {['商品缺货', '配送范围外', '价格有误', '其他原因'].map((reason) => (
              <Pressable key={reason} style={styles.reasonChip} onPress={() => setRejectReason(reason)}>
                <Text style={styles.reasonChipText}>{reason}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="拒单时必填"
            multiline
          />
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        {canReject ? (
          <Pressable
            style={[styles.actionBtnSecondary, acting && styles.disabled]}
            disabled={acting}
            onPress={() => {
              if (!rejectReason.trim()) {
                Alert.alert('提示', '拒单原因必填');
                return;
              }
              runAction(() => rejectSellerOrder(detail.id, rejectReason.trim()), '已拒单');
            }}
          >
            <Text style={styles.actionTextSecondary}>拒单</Text>
          </Pressable>
        ) : null}
        {canConfirm ? (
          <Pressable
            style={[styles.actionBtn, acting && styles.disabled]}
            disabled={acting}
            onPress={() => runAction(() => confirmSellerOrder(detail.id), '已接单')}
          >
            <Text style={styles.actionText}>接单</Text>
          </Pressable>
        ) : null}
        {canDeliver ? (
          <Pressable
            style={[styles.actionBtn, acting && styles.disabled]}
            disabled={acting}
            onPress={() => runAction(() => deliverSellerOrder(detail.id), '已发货')}
          >
            <Text style={styles.actionText}>发货</Text>
          </Pressable>
        ) : null}
        {canArrived ? (
          <Pressable
            style={[styles.actionBtn, acting && styles.disabled]}
            disabled={acting}
            onPress={() => runAction(() => arrivedSellerOrder(detail.id), '已送达')}
          >
            <Text style={styles.actionText}>送达</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: sellerColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sellerColors.background,
    padding: 20,
  },
  gray: {
    color: sellerColors.muted,
    fontSize: 13,
  },
  error: {
    color: sellerColors.destructive,
    fontSize: 13,
  },
  link: {
    marginTop: 10,
    color: sellerColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  urgentBar: {
    marginBottom: 12,
    backgroundColor: sellerColors.orange,
    borderRadius: sellerRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  urgentBody: {
    flex: 1,
  },
  urgentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgentText: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
  },
  heroCard: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.xl,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 18,
    marginBottom: 12,
    ...sellerShadow,
  },
  heroCardPending: {
    backgroundColor: sellerColors.orangeSoft,
    borderColor: '#FFD8BF',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroDate: {
    fontSize: 12,
    color: sellerColors.muted,
    fontWeight: '600',
  },
  heroAmount: {
    marginTop: 18,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    color: sellerColors.primary,
  },
  heroAmountPending: {
    color: sellerColors.orange,
  },
  heroOrderNo: {
    marginTop: 6,
    fontSize: 13,
    color: '#666666',
  },
  heroMetaRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: sellerRadius.pill,
    borderWidth: 1,
    borderColor: sellerColors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  heroMetaText: {
    fontSize: 12,
    color: sellerColors.foreground,
    fontWeight: '600',
  },
  card: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 14,
    marginBottom: 12,
    ...sellerShadow,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  subtle: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  contactMain: {
    flex: 1,
  },
  metaStrong: {
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  metaAddress: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#666666',
  },
  callBtn: {
    borderRadius: sellerRadius.md,
    borderWidth: 1,
    borderColor: '#B7EBD6',
    backgroundColor: sellerColors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  callBtnText: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.primary,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: sellerRadius.sm,
    backgroundColor: '#D1D5DB',
  },
  thumbPh: {
    backgroundColor: '#E5E7EB',
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    color: sellerColors.foreground,
    fontWeight: '600',
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: sellerColors.muted,
  },
  itemSubtotal: {
    fontSize: 13,
    color: sellerColors.foreground,
    fontWeight: '700',
  },
  amountSummary: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: sellerColors.border,
    paddingTop: 10,
  },
  sum: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  pay: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: sellerColors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: sellerColors.foreground,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  reasonChip: {
    borderRadius: sellerRadius.pill,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reasonChipText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  actionsRow: {
    gap: 10,
    marginTop: 2,
  },
  inlineActionBtn: {
    marginTop: 10,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.primarySoft,
    alignItems: 'center',
    paddingVertical: 11,
  },
  inlineActionText: {
    color: sellerColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtn: {
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.primary,
    alignItems: 'center',
    paddingVertical: 13,
  },
  actionBtnSecondary: {
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.card,
    borderWidth: 1,
    borderColor: '#FFD8BF',
    alignItems: 'center',
    paddingVertical: 13,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionTextSecondary: {
    color: sellerColors.orange,
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
});
