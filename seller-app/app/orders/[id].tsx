import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  arrivedSellerOrder,
  confirmSellerOrder,
  deliverSellerOrder,
  fetchSellerOrderDetail,
  rejectSellerOrder,
  updateSellerOrderRemark,
} from '@/api/order';
import { sellerOrderStatusLabel } from '@/constants/order';
import type { SellerOrderDetail } from '@/types/order';
import { resolveMediaUrl } from '@/utils/media';

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

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>订单信息</Text>
        <Text style={styles.meta}>订单号：{detail.order_no}</Text>
        <Text style={styles.meta}>状态：{sellerOrderStatusLabel(detail.status)}</Text>
        <Text style={styles.meta}>买家ID：{detail.buyer_id}</Text>
        <Text style={styles.meta}>下单时间：{detail.created_at.replace('T', ' ').slice(0, 16)}</Text>
        <Text style={styles.tip}>{actionHintByStatus(detail.status)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>收货信息</Text>
        <Text style={styles.meta}>{detail.receiver_name} {detail.receiver_phone}</Text>
        <Text style={styles.meta}>{detail.receiver_address}</Text>
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
                <Text style={styles.itemMeta}>¥{item.price} × {item.quantity} {item.unit}</Text>
              </View>
              <Text style={styles.itemSubtotal}>¥{item.subtotal}</Text>
            </View>
          );
        })}
        <Text style={styles.sum}>商品：¥{detail.total_amount}</Text>
        <Text style={styles.sum}>运费：¥{detail.freight_amount}</Text>
        <Text style={styles.pay}>应收：¥{detail.pay_amount}</Text>
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
          style={[styles.actionBtn, acting && styles.disabled]}
          disabled={acting}
          onPress={() => runAction(() => updateSellerOrderRemark(detail.id, remarkDraft), '备注已更新')}
        >
          <Text style={styles.actionText}>保存备注</Text>
        </Pressable>
      </View>

      {canReject ? (
        <View style={styles.card}>
          <Text style={styles.title}>拒单原因</Text>
          <TextInput
            style={styles.input}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="拒单时必填"
            multiline
          />
          <Pressable
            style={[styles.actionBtn, styles.warnBtn, acting && styles.disabled]}
            disabled={acting}
            onPress={() => {
              if (!rejectReason.trim()) {
                Alert.alert('提示', '拒单原因必填');
                return;
              }
              runAction(() => rejectSellerOrder(detail.id, rejectReason.trim()), '已拒单');
            }}
          >
            <Text style={styles.actionText}>拒单</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
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
    backgroundColor: '#f5f7fb',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
    padding: 20,
  },
  gray: {
    color: '#6b7280',
    fontSize: 13,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  link: {
    marginTop: 10,
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 4,
  },
  tip: {
    marginTop: 4,
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#d1d5db',
  },
  thumbPh: {
    backgroundColor: '#e5e7eb',
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  itemSubtotal: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  sum: {
    textAlign: 'right',
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  pay: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f766e',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  actionsRow: {
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingVertical: 10,
  },
  warnBtn: {
    backgroundColor: '#f59e0b',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
});
