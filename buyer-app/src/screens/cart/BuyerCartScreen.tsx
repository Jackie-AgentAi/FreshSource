import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  clearInvalidCart,
  deleteCartBatch,
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
import { colors, lineHeight, spacing, typography } from '@/theme/tokens';

import { CartShopCard } from './components/CartShopCard';

function collectValidItemIds(groups: CartShopGroup[]): number[] {
  const ids: number[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (!item.is_invalid) {
        ids.push(item.id);
      }
    }
  }
  return ids;
}

export function BuyerCartScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [groups, setGroups] = useState<CartShopGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [manageMode, setManageMode] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const nextGroups = await fetchCart();
      setGroups(nextGroups);
      const validIds = collectValidItemIds(nextGroups);
      setSelectedIds(new Set(validIds));
    } catch (error) {
      setGroups([]);
      setErrorMessage(error instanceof Error ? error.message : '购物车加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const validIds = useMemo(() => collectValidItemIds(groups), [groups]);
  const allSelected = validIds.length > 0 && validIds.every((id) => selectedIds.has(id));
  const selectedValidItems = useMemo(
    () =>
      groups.flatMap((group) => group.items).filter((item) => !item.is_invalid && selectedIds.has(item.id)),
    [groups, selectedIds],
  );
  const selectedCount = selectedValidItems.length;
  const selectedAmount = selectedValidItems.reduce(
    (sum, item) => sum + Number(item.product?.price ?? 0) * Number(item.quantity ?? 0),
    0,
  );

  const toggleSelectAll = () => {
    const nextSelected = allSelected ? new Set<number>() : new Set(validIds);
    setSelectedIds(nextSelected);
  };

  const toggleItem = (item: CartItemView) => {
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

  const removeItem = (item: CartItemView) => {
    Alert.alert('删除商品', `确定删除 ${item.product?.name || '该商品'} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteCartItem(item.id);
              await load();
            } catch (error) {
              Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试');
            }
          })();
        },
      },
    ]);
  };

  const updateQuantity = async (item: CartItemView, next: number) => {
    if (item.is_invalid) {
      return;
    }
    try {
      await updateCartItemQuantity(item.id, next);
      await load();
    } catch (error) {
      Alert.alert('更新失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const handleManageAction = async () => {
    if (manageMode) {
      if (selectedIds.size === 0) {
        Alert.alert('提示', '请选择要删除的商品');
        return;
      }
      try {
        await deleteCartBatch(Array.from(selectedIds));
        await load();
        setManageMode(false);
      } catch (error) {
        Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试');
      }
      return;
    }

    if (selectedCount === 0) {
      Alert.alert('提示', '请选择可结算商品');
      return;
    }
    useCheckoutDraftStore.getState().setCartItemIds(Array.from(selectedIds));
    useCheckoutDraftStore.getState().setAddressId(null);
    router.push('/checkout');
  };

  const syncSelectAll = async (selected: boolean) => {
    try {
      await selectAllCartItems(selected ? 1 : 0);
    } catch {
      /* 服务端当前没有逐项选择，这里失败时不阻塞本地交互 */
    }
  };

  const handleToggleAll = () => {
    const nextAllSelected = !allSelected;
    toggleSelectAll();
    void syncSelectAll(nextAllSelected);
  };

  const handleClearInvalid = async () => {
    try {
      await clearInvalidCart();
      await load();
    } catch (error) {
      Alert.alert('清理失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  if (loading && groups.length === 0) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (errorMessage && groups.length === 0) {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>购物车</Text>
        <Pressable accessibilityRole="button" onPress={() => setManageMode((prev) => !prev)} style={styles.manageButton}>
          <Text style={styles.manageText}>{manageMode ? '完成' : '管理'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 114 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {groups.length === 0 ? (
          <EmptyState title="购物车为空" description="去首页挑点新鲜食材吧" />
        ) : (
          <>
            {groups.map((group) => (
              <CartShopCard
                group={group}
                key={group.shop_id}
                manageMode={manageMode}
                onDeleteItem={removeItem}
                onOpenItem={(item) => router.push(`/product/${item.product_id}`)}
                onToggleItem={toggleItem}
                onUpdateQuantity={(item, next) => void updateQuantity(item, next)}
                selectedIds={selectedIds}
              />
            ))}

            <Pressable accessibilityRole="button" onPress={() => void handleClearInvalid()} style={styles.clearInvalidButton}>
              <Text style={styles.clearInvalidText}>清理失效商品</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {groups.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <Pressable accessibilityRole="button" onPress={handleToggleAll} style={styles.footerLeft}>
            <View style={[styles.footerCheck, allSelected && styles.footerCheckActive]}>
              {allSelected ? <Ionicons color={colors.surface} name="checkmark" size={16} /> : null}
            </View>
            <Text style={styles.footerLabel}>全选</Text>
          </Pressable>

          <View style={styles.summaryWrap}>
            <Text style={styles.summaryTop}>已选 {selectedCount} 件</Text>
            {!manageMode ? (
              <Text style={styles.summaryAmount}>
                合计: <Text style={styles.summaryAmountStrong}>¥{selectedAmount.toFixed(2)}</Text>
              </Text>
            ) : null}
          </View>

          <Pressable accessibilityRole="button" onPress={() => void handleManageAction()} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{manageMode ? '删除' : '结算'}</Text>
          </Pressable>
        </View>
      ) : null}
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
  manageButton: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  manageText: {
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    color: '#6B7280',
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
    backgroundColor: '#F3F6F3',
  },
  clearInvalidButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  clearInvalidText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: '#F87171',
    fontWeight: '600',
  },
  footer: {
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
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D7DED9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCheckActive: {
    backgroundColor: '#18A84A',
    borderColor: '#18A84A',
  },
  footerLabel: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.textStrong,
  },
  summaryWrap: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: spacing.lg,
  },
  summaryTop: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#6B7280',
  },
  summaryAmount: {
    marginTop: spacing.xs,
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: '#6B7280',
  },
  summaryAmountStrong: {
    color: '#18A84A',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  actionButton: {
    width: 160,
    minHeight: 84,
    borderRadius: 26,
    backgroundColor: '#18A84A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.surface,
    fontWeight: '700',
  },
});
