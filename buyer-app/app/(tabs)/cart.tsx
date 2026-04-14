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
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { useCheckoutDraftStore } from '@/store/checkoutDraft';
import type { CartItemView, CartShopGroup } from '@/types/cart';
import { colors, radius, spacing, typography } from '@/theme/tokens';
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
      <View style={styles.toolbar}>
        <Pressable onPress={() => void syncSelectAllServer(1)}>
          <Text style={styles.link}>全选(同步)</Text>
        </Pressable>
        <Pressable onPress={() => void syncSelectAllServer(0)}>
          <Text style={styles.link}>取消全选(同步)</Text>
        </Pressable>
        <Pressable onPress={onClearInvalid}>
          <Text style={styles.link}>清空失效</Text>
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
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
                <Text style={styles.price}>¥{Number(item.product?.price ?? 0).toFixed(2)}</Text>
                {item.is_invalid ? <Text style={styles.invalidTag}>失效</Text> : null}
                <View style={styles.qtyRow}>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="decimal-pad"
                    value={qtyDraft[item.id] ?? String(item.quantity)}
                    onChangeText={(t) => setQtyDraft((m) => ({ ...m, [item.id]: t }))}
                    onEndEditing={() => void applyQuantity(item)}
                  />
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
  link: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowInvalid: {
    opacity: 0.55,
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
    fontWeight: '600',
    color: colors.text,
  },
  price: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  invalidTag: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.danger,
    fontWeight: '600',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  qtyInput: {
    minWidth: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: typography.caption,
  },
  delBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  delText: {
    color: colors.danger,
    fontSize: typography.caption,
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
    color: colors.text,
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
