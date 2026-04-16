import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addCartItem } from '@/api/cart';
import { fetchProductDetail } from '@/api/catalog';
import { AppHeader } from '@/components/AppHeader';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { BuyerProductDetail } from '@/types/catalog';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

const WINDOW_WIDTH = Dimensions.get('window').width;

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const productId = Number(id);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [detail, setDetail] = useState<BuyerProductDetail | null>(null);
  const [qtyStr, setQtyStr] = useState('1');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(productId) || productId <= 0) {
      setErrorMessage('无效的商品');
      setPhase('error');
      return;
    }
    try {
      setPhase('loading');
      setErrorMessage('');
      const data = await fetchProductDetail(productId);
      setDetail(data);
      setQtyStr(String(data.min_buy ?? 1));
      setPhase('ready');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : '加载失败');
      setPhase('error');
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, detail?.name]);

  if (phase === 'loading') {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (phase === 'error' || !detail) {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage || '商品不可用'} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  const gallery = [detail.cover_image, ...(detail.images || [])].filter(Boolean);
  const uniqueUris = [...new Set(gallery.map((p) => resolveMediaUrl(p)).filter(Boolean))] as string[];

  const priceText =
    typeof detail.price === 'number' && !Number.isNaN(detail.price)
      ? `¥${detail.price.toFixed(2)}`
      : '—';

  const onAddCart = () => {
    if (!detail.can_buy) {
      Alert.alert('提示', '当前不可购买');
      return;
    }
    const q = parseFloat(qtyStr);
    if (!Number.isFinite(q) || q <= 0) {
      Alert.alert('提示', '请输入有效数量');
      return;
    }
    void (async () => {
      try {
        setAdding(true);
        await addCartItem({ product_id: detail.id, quantity: q });
        Alert.alert('已加入购物车');
      } catch (e) {
        Alert.alert('加购失败', e instanceof Error ? e.message : '请重试');
      } finally {
        setAdding(false);
      }
    })();
  };

  const onBuyNow = () => {
    if (!detail.can_buy) {
      Alert.alert('提示', '当前不可购买');
      return;
    }
    const q = parseFloat(qtyStr);
    if (!Number.isFinite(q) || q <= 0) {
      Alert.alert('提示', '请输入有效数量');
      return;
    }
    void (async () => {
      try {
        setAdding(true);
        await addCartItem({ product_id: detail.id, quantity: q });
        Alert.alert('已加入购物车', '可在购物车中立即结算', [
          { text: '继续逛逛' },
          { text: '去结算', onPress: () => router.push('/(tabs)/cart') },
        ]);
      } catch (e) {
        Alert.alert('操作失败', e instanceof Error ? e.message : '请重试');
      } finally {
        setAdding(false);
      }
    })();
  };

  return (
    <PageContainer>
      <AppHeader
        title="商品详情"
        subtitle={detail.shop?.shop_name || `店铺 #${detail.shop_id}`}
        right={
          <Pressable style={styles.headerAction} onPress={() => router.push('/(tabs)/cart')}>
            <Text style={styles.headerActionText}>购物车</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 110 + insets.bottom }]}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {uniqueUris.length ? (
            uniqueUris.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.hero} resizeMode="cover" />
            ))
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]} />
          )}
        </ScrollView>

        <View style={styles.block}>
          <Text style={styles.name}>{detail.name}</Text>
          {detail.subtitle ? <Text style={styles.subtitle}>{detail.subtitle}</Text> : null}
          <View style={styles.badgeRow}>
            <Text style={styles.brandBadge}>自营优选</Text>
            <Text style={styles.accentBadge}>VIP 优惠</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceText}</Text>
            <Text style={styles.unit}>{detail.unit ? `/${detail.unit}` : ''}</Text>
          </View>
          <Text style={styles.meta}>库存 {detail.stock} · 起购 {detail.min_buy}{detail.unit || ''} · 步长 {detail.step_buy}{detail.unit || ''}</Text>
          {!detail.can_buy ? <Text style={styles.warn}>当前不可购买</Text> : <Text style={styles.buyable}>支持立即加购</Text>}
          <View style={styles.cartRow}>
            <Text style={styles.cartLabel}>数量</Text>
            <Pressable style={styles.qtyBtn} onPress={() => setQtyStr(String(Math.max(1, Number(qtyStr || '1') - 1)))}>
              <Text style={styles.qtyBtnText}>-</Text>
            </Pressable>
            <TextInput
              style={styles.qtyInput}
              keyboardType="decimal-pad"
              value={qtyStr}
              onChangeText={setQtyStr}
            />
            <Pressable style={styles.qtyBtn} onPress={() => setQtyStr(String(Number((Number(qtyStr || '1') + 1).toFixed(2))))}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.shopRow}
          onPress={() => router.push(`/shop/${detail.shop_id}`)}
          accessibilityRole="button"
        >
          <Text style={styles.shopLabel}>店铺</Text>
          <Text style={styles.shopName} numberOfLines={1}>
            {detail.shop?.shop_name || `店铺 #${detail.shop_id}`}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {detail.description ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>图文详情</Text>
            <Text style={styles.desc}>{detail.description}</Text>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>规格与评价摘要</Text>
          <Text style={styles.desc}>商品规格：{detail.unit || '—'} / 起购 {detail.min_buy} / 步长 {detail.step_buy}</Text>
          <Text style={styles.desc}>店铺评分：{typeof detail.shop?.rating === 'number' ? detail.shop.rating.toFixed(1) : '暂无'}</Text>
          <Text style={styles.desc}>评价摘要：当前版本暂不展示评论内容，可在订单完成后评价。</Text>
        </View>

        {(detail.origin_place || detail.shelf_life || detail.storage_method) && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>规格</Text>
            {detail.origin_place ? <Text style={styles.desc}>产地：{detail.origin_place}</Text> : null}
            {detail.shelf_life ? <Text style={styles.desc}>保质期：{detail.shelf_life}</Text> : null}
            {detail.storage_method ? <Text style={styles.desc}>储存：{detail.storage_method}</Text> : null}
          </View>
        )}
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: spacing.sm + insets.bottom }]}>
        <Pressable
          style={[styles.actionGhostBtn, (adding || !detail.can_buy) && styles.addCartBtnDisabled]}
          disabled={adding || !detail.can_buy}
          onPress={onAddCart}
        >
          <Text style={styles.actionGhostText}>{adding ? '加入中…' : '加入购物车'}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionPrimaryBtn, (adding || !detail.can_buy) && styles.addCartBtnDisabled]}
          disabled={adding || !detail.can_buy}
          onPress={onBuyNow}
        >
          <Text style={styles.actionPrimaryText}>立即购买</Text>
        </Pressable>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl,
  },
  headerAction: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerActionText: {
    color: colors.primary,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
  gallery: {
    maxHeight: 280,
  },
  hero: {
    width: WINDOW_WIDTH,
    height: 280,
    backgroundColor: colors.border,
  },
  heroPlaceholder: {
    width: WINDOW_WIDTH,
  },
  block: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
    ...elevation.sm,
  },
  name: {
    fontSize: typography.h4,
    lineHeight: lineHeight.h4,
    fontWeight: '700',
    color: colors.textStrong,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
  },
  badgeRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  brandBadge: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  accentBadge: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
    color: colors.warning,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  priceRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: typography.h3,
    lineHeight: lineHeight.h3,
    fontWeight: '800',
    color: colors.primaryPressed,
  },
  unit: {
    marginLeft: spacing.xs,
    marginBottom: 2,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  meta: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  warn: {
    marginTop: spacing.md,
    color: colors.statusDangerText,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
    backgroundColor: colors.statusDangerBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  buyable: {
    marginTop: spacing.md,
    color: colors.statusSuccessText,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  cartLabel: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: colors.textStrong,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  qtyInput: {
    minWidth: 90,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    textAlign: 'center',
    backgroundColor: colors.surface,
  },
  addCartBtnDisabled: {
    opacity: 0.5,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
  },
  shopLabel: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  shopName: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.textStrong,
  },
  desc: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionGhostBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionGhostText: {
    color: colors.primary,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
  actionPrimaryBtn: {
    flex: 1,
    backgroundColor: colors.primaryPressed,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionPrimaryText: {
    color: colors.surface,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
  },
});
