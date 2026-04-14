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

import { addCartItem } from '@/api/cart';
import { fetchProductDetail } from '@/api/catalog';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { BuyerProductDetail } from '@/types/catalog';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

const WINDOW_WIDTH = Dimensions.get('window').width;

export default function ProductDetailScreen() {
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
    if (detail?.name) {
      navigation.setOptions({ title: detail.name });
    }
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

  return (
    <PageContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
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
          <Text style={styles.price}>{priceText}</Text>
          <Text style={styles.meta}>
            单位 {detail.unit || '—'} · 起购 {detail.min_buy} · 步长 {detail.step_buy}
          </Text>
          <Text style={styles.meta}>库存 {detail.stock}</Text>
          {!detail.can_buy ? <Text style={styles.warn}>当前不可购买</Text> : null}
          <View style={styles.cartRow}>
            <Text style={styles.cartLabel}>数量</Text>
            <TextInput
              style={styles.qtyInput}
              keyboardType="decimal-pad"
              value={qtyStr}
              onChangeText={setQtyStr}
            />
            <Pressable
              style={[styles.addCartBtn, (adding || !detail.can_buy) && styles.addCartBtnDisabled]}
              disabled={adding || !detail.can_buy}
              onPress={onAddCart}
            >
              <Text style={styles.addCartText}>{adding ? '加入中…' : '加入购物车'}</Text>
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
            <Text style={styles.sectionTitle}>详情</Text>
            <Text style={styles.desc}>{detail.description}</Text>
          </View>
        ) : null}

        {(detail.origin_place || detail.shelf_life || detail.storage_method) && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>规格</Text>
            {detail.origin_place ? <Text style={styles.desc}>产地：{detail.origin_place}</Text> : null}
            {detail.shelf_life ? <Text style={styles.desc}>保质期：{detail.shelf_life}</Text> : null}
            {detail.storage_method ? <Text style={styles.desc}>储存：{detail.storage_method}</Text> : null}
          </View>
        )}
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xl * 2,
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
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  price: {
    marginTop: spacing.md,
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  meta: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  warn: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cartLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  qtyInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
  },
  addCartBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addCartBtnDisabled: {
    opacity: 0.5,
  },
  addCartText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.caption,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  shopLabel: {
    fontSize: typography.caption,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  shopName: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  desc: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
