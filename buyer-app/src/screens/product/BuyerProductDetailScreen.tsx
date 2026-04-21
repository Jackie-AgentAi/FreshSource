import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addCartItem } from '@/api/cart';
import { fetchProductDetail } from '@/api/catalog';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { QuantityStepper } from '@/components/QuantityStepper';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import type { BuyerProductDetail } from '@/types/catalog';
import { resolveMediaUrl } from '@/utils/media';

const WINDOW_WIDTH = Dimensions.get('window').width;

function buildGallery(detail: BuyerProductDetail): string[] {
  const candidates = [detail.cover_image, ...detail.images].map((item) => resolveMediaUrl(item));
  return [...new Set(candidates.filter(Boolean))] as string[];
}

function buildReviewHint(detail: BuyerProductDetail): string {
  if (detail.description) {
    return detail.description.trim().slice(0, 40);
  }
  return '当前版本先展示商品摘要，真实评价接口接通后会替换为买家评价内容。';
}

export function BuyerProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const productId = Number(id);
  const galleryRef = useRef<ScrollView | null>(null);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [detail, setDetail] = useState<BuyerProductDetail | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const load = useCallback(async () => {
    if (!Number.isFinite(productId) || productId <= 0) {
      setErrorMessage('无效的商品编号');
      setPhase('error');
      return;
    }

    try {
      setErrorMessage('');
      setPhase('loading');
      const nextDetail = await fetchProductDetail(productId);
      setDetail(nextDetail);
      setQuantity(nextDetail.min_buy > 0 ? nextDetail.min_buy : 1);
      setGalleryIndex(0);
      setPhase('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '商品详情加载失败');
      setPhase('error');
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const gallery = useMemo(() => (detail ? buildGallery(detail) : []), [detail]);
  const reviewHint = useMemo(() => (detail ? buildReviewHint(detail) : ''), [detail]);
  const shopImage = detail ? resolveMediaUrl(detail.shop.logo) || gallery[0] : undefined;
  const bottomPadding = 112 + insets.bottom;

  const addToCart = async (redirectToCart: boolean) => {
    if (!detail || !detail.can_buy) {
      Alert.alert('提示', '当前商品暂不可购买');
      return;
    }
    try {
      setAdding(true);
      await addCartItem({ product_id: detail.id, quantity });
      if (redirectToCart) {
        router.push('/(tabs)/cart');
        return;
      }
      Alert.alert('成功', '已加入购物车');
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setAdding(false);
    }
  };

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
        <ErrorRetryView message={errorMessage || '商品详情加载失败'} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerIcon}
        >
          <Ionicons color={colors.textStrong} name="chevron-back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>商品详情</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/cart')}
          style={styles.headerIcon}
        >
          <Ionicons color={colors.textStrong} name="cart-outline" size={28} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          ref={galleryRef}
          onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x / Math.max(event.nativeEvent.layoutMeasurement.width, 1),
            );
            setGalleryIndex(Math.min(Math.max(nextIndex, 0), Math.max(gallery.length - 1, 0)));
          }}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {gallery.length > 0 ? (
            gallery.map((uri) => <Image key={uri} source={{ uri }} style={styles.heroImage} />)
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]} />
          )}
        </ScrollView>

        {gallery.length > 1 ? (
          <View style={styles.thumbnailRow}>
            {gallery.map((uri, index) => (
              <Pressable
                key={uri}
                accessibilityRole="button"
                onPress={() => {
                  galleryRef.current?.scrollTo({ x: WINDOW_WIDTH * index, animated: true });
                  setGalleryIndex(index);
                }}
                style={[
                  styles.thumbnailWrap,
                  index === galleryIndex && styles.thumbnailWrapActive,
                ]}
              >
                <Image source={{ uri }} style={styles.thumbnail} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.price}>
            ¥ {detail.price.toFixed(1)}
            <Text style={styles.unit}>/{detail.unit || '斤'}</Text>
          </Text>
          <Text style={styles.productName}>{detail.name}</Text>
          <Text style={styles.productSubtitle}>{detail.subtitle || '新鲜直供，按需采购'}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons color="#F59E0B" name="star" size={20} />
              <Text style={styles.metaText}>{detail.shop.rating.toFixed(1)} 店铺评分</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons color="#7B8597" name="location-outline" size={20} />
              <Text style={styles.metaText}>
                产地: {detail.origin_place || `${detail.shop.city}${detail.shop.district}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>起订量</Text>
            <Text style={styles.specValue}>
              {detail.min_buy}
              {detail.unit || '斤'}
            </Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>库存</Text>
            <Text style={styles.specValue}>
              {detail.stock}
              {detail.unit || '斤'}
            </Text>
          </View>
          <View style={[styles.specRow, styles.specRowLast]}>
            <Text style={styles.specLabel}>购买数量</Text>
            <QuantityStepper
              disabled={!detail.can_buy}
              min={detail.min_buy > 0 ? detail.min_buy : 1}
              onChange={setQuantity}
              step={detail.step_buy > 0 ? detail.step_buy : 1}
              value={quantity}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/shop/${detail.shop_id}`)}
          style={styles.shopCard}
        >
          {shopImage ? (
            <Image source={{ uri: shopImage }} style={styles.shopImage} />
          ) : (
            <View style={[styles.shopImage, styles.shopImagePlaceholder]} />
          )}
          <View style={styles.shopBody}>
            <Text numberOfLines={1} style={styles.shopName}>
              {detail.shop.shop_name}
            </Text>
            <View style={styles.shopMetaRow}>
              <Ionicons color="#F59E0B" name="star" size={18} />
              <Text style={styles.shopMetaText}>{detail.shop.rating.toFixed(1)}</Text>
              <Text style={styles.shopMetaText}>月销 {detail.shop.total_sales}</Text>
            </View>
          </View>
          <View style={styles.shopAction}>
            <Text style={styles.shopActionText}>进店</Text>
          </View>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>商品评价</Text>
            <Text style={styles.reviewCount}>店铺评分</Text>
          </View>
          <View style={styles.reviewSummaryRow}>
            <Ionicons color="#F59E0B" name="star" size={24} />
            <Text style={styles.reviewScore}>{detail.shop.rating.toFixed(1)}</Text>
            <Text style={styles.reviewScoreHint}>优质商家，好评率稳定</Text>
          </View>
          <View style={styles.reviewCard}>
            <View style={styles.reviewTopRow}>
              <Text style={styles.reviewAuthor}>FreshMart 买家</Text>
              <Text style={styles.reviewDate}>评价内容待接入</Text>
            </View>
            <View style={styles.reviewStars}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Ionicons key={index} color="#F59E0B" name="star" size={18} />
              ))}
            </View>
            <Text style={styles.reviewBody}>{reviewHint}</Text>
          </View>
        </View>

        {(detail.description || detail.storage_method || detail.shelf_life) && (
          <View style={styles.section}>
            <Text style={styles.detailTitle}>商品信息</Text>
            {detail.description ? <Text style={styles.detailText}>{detail.description}</Text> : null}
            {detail.storage_method ? (
              <Text style={styles.detailText}>储存方式：{detail.storage_method}</Text>
            ) : null}
            {detail.shelf_life ? <Text style={styles.detailText}>保质期：{detail.shelf_life}</Text> : null}
          </View>
        )}
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: spacing.md + insets.bottom }]}>
        <Pressable
          accessibilityRole="button"
          disabled={adding || !detail.can_buy}
          onPress={() => void addToCart(false)}
          style={[styles.secondaryButton, (!detail.can_buy || adding) && styles.buttonDisabled]}
        >
          <Text style={styles.secondaryButtonText}>{adding ? '加入中...' : '加入购物车'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={adding || !detail.can_buy}
          onPress={() => void addToCart(true)}
          style={[styles.primaryButton, (!detail.can_buy || adding) && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>立即购买</Text>
        </Pressable>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.textStrong,
    fontWeight: '700',
  },
  content: {
    backgroundColor: '#F3F6F3',
  },
  heroImage: {
    width: WINDOW_WIDTH,
    height: WINDOW_WIDTH,
    backgroundColor: '#E5EAE4',
  },
  heroPlaceholder: {
    backgroundColor: '#E3E8E2',
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  thumbnailWrap: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailWrapActive: {
    borderColor: '#18A84A',
  },
  thumbnail: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: '#E5EAE4',
  },
  section: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  price: {
    fontSize: 28,
    lineHeight: 36,
    color: '#18A84A',
    fontWeight: '800',
  },
  unit: {
    color: '#7B8597',
    fontWeight: '400',
  },
  productName: {
    marginTop: spacing.md,
    fontSize: 26,
    lineHeight: 34,
    color: colors.textStrong,
    fontWeight: '700',
  },
  productSubtitle: {
    marginTop: spacing.sm,
    fontSize: 18,
    lineHeight: 28,
    color: '#7B8597',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#6B7280',
  },
  specRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
  },
  specRowLast: {
    borderBottomWidth: 0,
    paddingTop: spacing.md,
  },
  specLabel: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  specValue: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.textStrong,
    fontWeight: '500',
  },
  shopCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopImage: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#E5EAE4',
  },
  shopImagePlaceholder: {
    backgroundColor: '#E3E8E2',
  },
  shopBody: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  shopName: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shopMetaText: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#6B7280',
  },
  shopAction: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#E5EAE4',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  shopActionText: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '600',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 18,
    lineHeight: 24,
    color: '#7B8597',
  },
  reviewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  reviewScore: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.textStrong,
    fontWeight: '700',
  },
  reviewScoreHint: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  reviewCard: {
    marginTop: spacing.lg,
    backgroundColor: '#F2F5F1',
    borderRadius: 24,
    padding: spacing.lg,
  },
  reviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#7B8597',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  reviewBody: {
    marginTop: spacing.lg,
    fontSize: 18,
    lineHeight: 30,
    color: '#6B7280',
  },
  detailTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textStrong,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  detailText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#5F6978',
    marginBottom: spacing.sm,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E8EDE8',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: '#18A84A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.surface,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#18A84A',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#18A84A',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
