import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  clearInvalidCart,
  deleteCartItem,
  fetchCart,
  selectAllCartItems,
  updateCartItemQuantity,
} from '@/api/cart';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { useCheckoutDraftStore } from '@/store/checkoutDraft';
import type { CartItemView, CartShopGroup } from '@/types/cart';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import { resolveMediaUrl } from '@/utils/media';

function collectValidItemIds(groups: CartShopGroup[]): number[] {
  const ids: number[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      if (!it.is_invalid) {
        ids.push(it.id);
      }
    }
  }
  return ids;
}

export default function CartTabPage() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<CartShopGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCart();
      setGroups(data);
      const next = new Set<number>();
      for (const g of data) {
        for (const it of g.items) {
          if (!it.is_invalid && it.selected === 1) {
            next.add(it.id);
          }
        }
      }
      setSelectedIds(next);
      const q: Record<number, string> = {};
      for (const g of data) {
        for (const it of g.items) {
          q[it.id] = String(it.quantity);
        }
      }
      setQtyDraft(q);
    } catch (e) {
      setGroups([]);
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sections = useMemo(
    () =>
      groups.map((g) => ({
        title: g.shop?.shop_name || `店铺 #${g.shop_id}`,
        data: g.items,
      })),
    [groups],
  );

  const validIds = useMemo(() => collectValidItemIds(groups), [groups]);
  const allSelected = validIds.length > 0 && validIds.every((id) => selectedIds.has(id));
  const selectedItems = useMemo(
    () =>
      groups
        .flatMap((g) => g.items)
        .filter((it) => !it.is_invalid && selectedIds.has(it.id)),
    [groups, selectedIds],
  );
  const selectedCount = selectedItems.length;
  const selectedAmount = useMemo(
    () => selectedItems.reduce((sum, it) => sum + Number(it.product?.price ?? 0) * Number(it.quantity ?? 0), 0),
    [selectedItems],
  );

  const toggleSelect = (item: CartItemView) => {
    if (item.is_invalid) {
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  const toggleSelectAllLocal = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(validIds));
    }
  };

  const syncSelectAllServer = async (selected: 0 | 1) => {
    try {
      await selectAllCartItems(selected);
      await load();
    } catch (e) {
      Alert.alert('提示', e instanceof Error ? e.message : '操作失败');
    }
  };

  const applyQuantity = async (item: CartItemView) => {
    const raw = (qtyDraft[item.id] ?? '').trim();
    const q = parseFloat(raw);
    if (!Number.isFinite(q) || q <= 0) {
      Alert.alert('提示', '请输入有效数量');
      return;
    }
    try {
      await updateCartItemQuantity(item.id, q);
      await load();
    } catch (e) {
      Alert.alert('提示', e instanceof Error ? e.message : '修改失败');
    }
  };

  const adjustQuantity = async (item: CartItemView, delta: number) => {
    const current = Number(qtyDraft[item.id] ?? item.quantity);
    const next = Math.max(1, Number((current + delta).toFixed(2)));
    setQtyDraft((prev) => ({ ...prev, [item.id]: String(next) }));
    try {
      await updateCartItemQuantity(item.id, next);
      await load();
    } catch (e) {
      Alert.alert('提示', e instanceof Error ? e.message : '修改失败');
    }
  };

  const removeItem = (item: CartItemView) => {
    Alert.alert('删除', '确定从购物车移除该商品？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteCartItem(item.id);
              await load();
            } catch (e) {
              Alert.alert('提示', e instanceof Error ? e.message : '删除失败');
            }
          })();
        },
      },
    ]);
  };

  const onClearInvalid = () => {
    void (async () => {
      try {
        const n = await clearInvalidCart();
        Alert.alert('完成', n > 0 ? `已清理 ${n} 条失效商品` : '没有失效商品');
        await load();
      } catch (e) {
        Alert.alert('提示', e instanceof Error ? e.message : '清理失败');
      }
    })();
  };

  const goCheckout = () => {
    const ids = validIds.filter((id) => selectedIds.has(id));
    if (ids.length === 0) {
      Alert.alert('提示', '请选择可结算的商品');
      return;
    }
    useCheckoutDraftStore.getState().setCartItemIds(ids);
    useCheckoutDraftStore.getState().setAddressId(null);
    router.push('/checkout');
  };

  if (loading && groups.length === 0) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (error && groups.length === 0) {
    return (
      <PageContainer>
        <ErrorRetryView message={error} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AppHeader title="购物车" subtitle="按店铺分组管理，支持批量结算" />
      <View style={styles.toolbar}>
        <Pressable style={styles.toolbarAction} onPress={() => void syncSelectAllServer(1)}>
          <Text style={styles.link}>全选(同步)</Text>
        </Pressable>
        <Pressable style={styles.toolbarAction} onPress={() => void syncSelectAllServer(0)}>
          <Text style={styles.link}>取消全选(同步)</Text>
        </Pressable>
        <Pressable style={styles.toolbarAction} onPress={onClearInvalid}>
          <Text style={styles.link}>清空失效</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section: { title, data } }) => {
          const validCount = data.filter((it) => !it.is_invalid).length;
          const invalidCount = data.length - validCount;
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.sectionMetaWrap}>
                <Text style={styles.sectionMeta}>有效 {validCount}</Text>
                {invalidCount > 0 ? <Text style={styles.sectionMetaDanger}>失效 {invalidCount}</Text> : null}
              </View>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const uri = resolveMediaUrl(item.product?.cover_image);
          const checked = selectedIds.has(item.id);
          return (
            <View style={[styles.row, item.is_invalid && styles.rowInvalid]}>
              <Pressable style={styles.check} onPress={() => toggleSelect(item)} accessibilityRole="checkbox">
                <View style={[styles.checkBox, checked && styles.checkBoxOn]} />
              </Pressable>
              <Pressable onPress={() => router.push(`/product/${item.product_id}`)}>
                {uri ? (
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]} />
                )}
              </Pressable>
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.product?.name || '商品'}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>¥{Number(item.product?.price ?? 0).toFixed(2)}</Text>
                  <Text style={styles.unit}>{item.product?.unit ? `/${item.product.unit}` : ''}</Text>
                </View>
                <View style={styles.tagsRow}>
                  {item.is_invalid ? <Text style={styles.invalidTag}>失效商品</Text> : null}
                  {!item.is_invalid ? <Text style={styles.validTag}>可结算</Text> : null}
                </View>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={[styles.qtyBtn, item.is_invalid && styles.qtyBtnDisabled]}
                    disabled={item.is_invalid}
                    onPress={() => void adjustQuantity(item, -1)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </Pressable>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="decimal-pad"
                    value={qtyDraft[item.id] ?? String(item.quantity)}
                    onChangeText={(t) => setQtyDraft((m) => ({ ...m, [item.id]: t }))}
                    onEndEditing={() => void applyQuantity(item)}
                    editable={!item.is_invalid}
                  />
                  <Pressable
                    style={[styles.qtyBtn, item.is_invalid && styles.qtyBtnDisabled]}
                    disabled={item.is_invalid}
                    onPress={() => void adjustQuantity(item, 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                  <Pressable onPress={() => removeItem(item)} style={styles.delBtn}>
                    <Text style={styles.delText}>删除</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState title="购物车是空的" description="去首页逛逛" />}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
      />

      {groups.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <View style={styles.footerRow}>
            <Pressable style={styles.footerCheck} onPress={toggleSelectAllLocal}>
              <View style={[styles.checkBox, allSelected && styles.checkBoxOn]} />
              <Text style={styles.footerCheckText}>全选</Text>
            </Pressable>
            <View style={styles.totalWrap}>
              <Text style={styles.totalLabel}>已选 {selectedCount} 件</Text>
              <Text style={styles.totalAmount}>¥{selectedAmount.toFixed(2)}</Text>
            </View>
            <Pressable style={styles.checkoutBtn} onPress={goCheckout}>
              <Text style={styles.checkoutText}>去结算</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toolbarAction: {
    paddingVertical: spacing.xs,
  },
  link: {
    color: colors.primary,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '700',
    color: colors.textStrong,
    flex: 1,
  },
  sectionMetaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionMeta: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  sectionMetaDanger: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.statusDangerText,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...elevation.sm,
  },
  rowInvalid: {
    backgroundColor: colors.surfaceDisabled,
    borderColor: colors.borderStrong,
  },
  check: {
    paddingTop: spacing.lg,
    paddingRight: spacing.sm,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkBoxOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  thumbPh: {
    backgroundColor: '#e5e5e5',
  },
  rowBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    fontWeight: '600',
    color: colors.textStrong,
  },
  priceRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  unit: {
    marginLeft: spacing.xxs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
  },
  tagsRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  invalidTag: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.statusDangerText,
    fontWeight: '700',
    backgroundColor: colors.statusDangerBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  validTag: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.statusSuccessText,
    fontWeight: '600',
    backgroundColor: colors.statusSuccessBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.5,
  },
  qtyBtnText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textStrong,
    fontWeight: '700',
  },
  qtyInput: {
    minWidth: 64,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    backgroundColor: colors.surface,
  },
  delBtn: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  delText: {
    color: colors.statusDangerText,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerCheckText: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
  },
  totalWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  totalAmount: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.primary,
    fontWeight: '700',
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  checkoutText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.body,
  },
});
