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
import { colors, spacing } from '@/theme/tokens';

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

function collectGroupSelectableIds(group: CartShopGroup): number[] {
  return group.items.filter((item) => !item.is_invalid).map((item) => item.id);
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
      groups
        .flatMap((group) => group.items)
        .filter((item) => !item.is_invalid && selectedIds.has(item.id)),
    [groups, selectedIds],
  );
  const selectedCount = selectedValidItems.length;
  const selectedAmount = selectedValidItems.reduce(
    (sum, item) => sum + Number(item.product?.price ?? 0) * Number(item.quantity ?? 0),
    0,
  );

  const toggleItem = (item: CartItemView) => {
    if (item.is_invalid && !manageMode) {
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

  const toggleGroup = (group: CartShopGroup) => {
    const ids = collectGroupSelectableIds(group);
    if (ids.length === 0) {
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      const fullySelected = ids.every((id) => next.has(id));

      ids.forEach((id) => {
        if (fullySelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });

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

  const handlePrimaryAction = async () => {
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
      // Keep local interaction responsive even if backend selection sync fails.
    }
  };

  const handleToggleAll = () => {
    const nextAllSelected = !allSelected;
    setSelectedIds(nextAllSelected ? new Set(validIds) : new Set());
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
        <Text style={styles.headerTitle}>购物车</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setManageMode((prev) => !prev)}
          style={styles.manageButton}
        >
          <Text style={styles.manageText}>{manageMode ? '完成' : '管理'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 104 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <EmptyState
            title="购物车为空"
            description="去首页挑点新鲜食材吧"
            actionText="去采购"
            onAction={() => router.push('/(tabs)/categories')}
          />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>采购清单</Text>
                <Text style={styles.summaryDesc}>
                  {groups.length} 家店铺 · {validIds.length} 件可结算商品
                </Text>
              </View>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryPillText}>{manageMode ? '管理模式' : `已选 ${selectedCount}`}</Text>
              </View>
            </View>

            {groups.map((group) => {
              const shopSelectedIds = collectGroupSelectableIds(group);
              const shopSelected =
                shopSelectedIds.length > 0 &&
                shopSelectedIds.every((id) => selectedIds.has(id));

              return (
                <CartShopCard
                  group={group}
                  key={group.shop_id}
                  manageMode={manageMode}
                  onDeleteItem={removeItem}
                  onOpenItem={(item) => router.push(`/product/${item.product_id}`)}
                  onToggleItem={toggleItem}
                  onToggleShop={toggleGroup}
                  onUpdateQuantity={(item, next) => void updateQuantity(item, next)}
                  selectedIds={selectedIds}
                  shopSelected={shopSelected}
                />
              );
            })}

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleClearInvalid()}
              style={styles.clearInvalidButton}
            >
              <Text style={styles.clearInvalidText}>清理失效商品</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {groups.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <View style={styles.footerLeft}>
            <Pressable accessibilityRole="button" onPress={handleToggleAll} style={styles.selectAllWrap}>
              <View style={[styles.footerCheck, allSelected && styles.footerCheckActive]}>
                {allSelected ? <Ionicons color="#FFFFFF" name="checkmark" size={14} /> : null}
              </View>
              <Text style={styles.footerLabel}>全选</Text>
            </Pressable>
          </View>

          <View style={styles.summaryWrap}>
            <Text style={styles.summaryTop}>已选 {manageMode ? selectedIds.size : selectedCount} 件</Text>
            {!manageMode ? (
              <View style={styles.summaryAmountRow}>
                <Text style={styles.summaryAmountLabel}>合计:</Text>
                <Text style={styles.summaryAmountCurrency}>¥</Text>
                <Text style={styles.summaryAmountValue}>{selectedAmount.toFixed(2)}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => void handlePrimaryAction()}
            style={[
              styles.actionButton,
              ((manageMode && selectedIds.size === 0) || (!manageMode && selectedCount === 0)) &&
                styles.actionButtonDisabled,
            ]}
          >
            <Text style={styles.actionButtonText}>{manageMode ? '删除' : '结算'}</Text>
          </Pressable>
        </View>
      ) : null}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 68,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.textStrong,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  manageButton: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  manageText: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  summaryCard: {
    marginBottom: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  summaryDesc: {
    marginTop: spacing.xs,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    lineHeight: 18,
  },
  summaryPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  clearInvalidButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearInvalidText: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLeft: {
    width: 64,
  },
  selectAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  footerCheckActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footerLabel: {
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryWrap: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: spacing.md,
  },
  summaryTop: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  summaryAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  summaryAmountLabel: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 18,
  },
  summaryAmountCurrency: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  summaryAmountValue: {
    color: colors.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginLeft: 1,
  },
  actionButton: {
    minWidth: 104,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
});
