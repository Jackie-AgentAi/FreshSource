import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { batchUpdateSellerProductPrices, fetchAllSellerProducts } from '@/api/product';
import { SellerScreenHeader } from '@/components/SellerScreenHeader';
import { sellerColors, sellerRadius } from '@/theme/seller';
import type { SellerProduct } from '@/types/product';
import { formatCurrency } from '@/utils/seller';

type AdjustmentMode = 'increase' | 'decrease' | null;

export default function QuickPricePage() {
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<AdjustmentMode>(null);
  const [batchValue, setBatchValue] = useState('');

  const load = useCallback(async () => {
    const data = await fetchAllSellerProducts({ status: 1 });
    setProducts(data);
    setDrafts(Object.fromEntries(data.map((item) => [item.id, item.price.toFixed(2)])));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const changedItems = useMemo(
    () =>
      products.filter((item) => {
        const next = Number(drafts[item.id] ?? item.price);
        return Number.isFinite(next) && next > 0 && Number(next.toFixed(2)) !== Number(item.price.toFixed(2));
      }),
    [drafts, products],
  );

  const applyBatch = useCallback(() => {
    if (!mode || !batchValue) {
      return;
    }
    const amount = Number(batchValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('提示', '请输入有效调价金额');
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      products.forEach((item) => {
        const price = mode === 'increase' ? item.price + amount : Math.max(0.01, item.price - amount);
        next[item.id] = price.toFixed(2);
      });
      return next;
    });
    setBatchValue('');
    setMode(null);
  }, [batchValue, mode, products]);

  const saveChanges = useCallback(async () => {
    if (changedItems.length === 0) {
      return;
    }
    try {
      setSaving(true);
      await batchUpdateSellerProductPrices(
        changedItems.map((item) => ({
          id: item.id,
          price: Number(drafts[item.id]),
        })),
      );
      Alert.alert('保存成功', `已更新 ${changedItems.length} 件商品价格`);
      await load();
    } catch (e) {
      Alert.alert('保存失败', e instanceof Error ? e.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [changedItems, drafts, load]);

  return (
    <View style={styles.page}>
      <SellerScreenHeader
        title="快速改价"
        onBack={() => router.back()}
        right={
          changedItems.length > 0 ? (
            <Text style={styles.headerAction} onPress={() => void saveChanges()}>
              {saving ? '保存中...' : '保存'}
            </Text>
          ) : undefined
        }
      />

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>批量调价</Text>
          <View style={styles.modeRow}>
            <ModeButton active={mode === 'increase'} label="统一涨价" icon="trending-up-outline" onPress={() => setMode('increase')} />
            <ModeButton active={mode === 'decrease'} label="统一降价" icon="trending-down-outline" onPress={() => setMode('decrease')} />
          </View>
          {mode ? (
            <View style={styles.batchRow}>
              <TextInput
                style={styles.batchInput}
                value={batchValue}
                onChangeText={setBatchValue}
                keyboardType="decimal-pad"
                placeholder="输入调价金额"
                placeholderTextColor={sellerColors.muted}
              />
              <Pressable style={({ pressed }) => [styles.applyBtn, pressed ? styles.pressed : null]} onPress={applyBatch}>
                <Text style={styles.applyBtnText}>应用</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {changedItems.length > 0 ? (
          <View style={styles.notice}>
            <Ionicons name="checkmark-circle-outline" size={16} color={sellerColors.primary} />
            <Text style={styles.noticeText}>已修改 {changedItems.length} 件商品价格</Text>
          </View>
        ) : null}

        {products.map((product) => {
          const current = product.price;
          const next = Number(drafts[product.id] ?? current);
          const changed = Number.isFinite(next) && Number(next.toFixed(2)) !== Number(current.toFixed(2));
          const diff = next - current;
          return (
            <View key={product.id} style={[styles.productCard, changed ? styles.productChanged : null]}>
              <View style={styles.productTop}>
                <View style={styles.productMain}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productMeta}>库存 {product.stock}{product.unit} · {product.subtitle || `分类 ${product.category_id}`}</Text>
                </View>
                {changed ? (
                  <Text style={[styles.diffText, diff >= 0 ? styles.diffUp : styles.diffDown]}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.priceRow}>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>原价</Text>
                  <Text style={styles.priceValue}>{formatCurrency(current)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={sellerColors.muted} />
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>新价</Text>
                  <TextInput
                    style={[styles.priceInput, changed ? styles.priceInputChanged : null]}
                    value={drafts[product.id] ?? current.toFixed(2)}
                    onChangeText={(value) => setDrafts((prev) => ({ ...prev, [product.id]: value }))}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ModeButton({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.modeBtn, active ? styles.modeBtnActive : null, pressed ? styles.pressed : null]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={active ? '#FFFFFF' : sellerColors.foreground} />
      <Text style={[styles.modeBtnText, active ? styles.modeBtnTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: sellerColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  headerAction: {
    color: sellerColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.secondary,
    paddingVertical: 11,
  },
  modeBtnActive: {
    backgroundColor: sellerColors.primary,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.94,
  },
  batchRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  batchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: sellerRadius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: sellerColors.foreground,
  },
  applyBtn: {
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notice: {
    marginBottom: 12,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: '#B7EBD6',
    backgroundColor: sellerColors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: sellerColors.primary,
  },
  productCard: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 16,
    marginBottom: 12,
  },
  productChanged: {
    borderColor: '#8DE2C2',
    backgroundColor: '#F7FFFB',
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  productMain: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  productMeta: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  diffText: {
    fontSize: 13,
    fontWeight: '700',
  },
  diffUp: {
    color: sellerColors.success,
  },
  diffDown: {
    color: sellerColors.destructive,
  },
  priceRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceBlock: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: sellerColors.muted,
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: sellerRadius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: sellerColors.foreground,
    fontWeight: '700',
  },
  priceInputChanged: {
    borderColor: sellerColors.primary,
    backgroundColor: sellerColors.primarySoft,
    color: sellerColors.primary,
  },
});
