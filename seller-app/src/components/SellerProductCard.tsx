import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SellerStatusBadge } from '@/components/SellerStatusBadge';
import { sellerProductStatusLabel } from '@/constants/product';
import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';
import type { SellerProduct } from '@/types/product';
import { formatCurrency } from '@/utils/seller';

export function SellerProductCard({
  item,
  onEdit,
  onToggle,
}: {
  item: SellerProduct;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const statusLabel = sellerProductStatusLabel(item.status);
  const lowStock = item.status === 1 && item.stock <= 10;

  return (
    <View style={[styles.card, lowStock ? styles.cardDanger : null, item.status === 2 ? styles.cardWarning : null]}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle || `分类 ID ${item.category_id}`}
          </Text>
        </View>
        <SellerStatusBadge label={statusLabel} />
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatCurrency(item.price)}</Text>
        <Text style={styles.unit}>/{item.unit || '件'}</Text>
      </View>

      <View style={styles.metaWrap}>
        <View style={styles.metaChip}>
          <Ionicons name="cube-outline" size={14} color={sellerColors.muted} />
          <Text style={styles.metaText}>库存 {item.stock}</Text>
        </View>
        <View style={styles.metaChip}>
          <Ionicons name="albums-outline" size={14} color={sellerColors.muted} />
          <Text style={styles.metaText}>分类 {item.category_id}</Text>
        </View>
        {lowStock ? (
          <View style={[styles.metaChip, styles.metaChipDanger]}>
            <Ionicons name="alert-circle-outline" size={14} color={sellerColors.destructive} />
            <Text style={styles.metaDangerText}>低库存预警</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.btnPressed : null]} onPress={onEdit}>
          <Ionicons name="create-outline" size={15} color={sellerColors.foreground} />
          <Text style={styles.secondaryBtnText}>编辑</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            item.status === 2 ? styles.primaryBtnDisabled : null,
            pressed ? styles.btnPressed : null,
          ]}
          onPress={onToggle}
          disabled={item.status === 2}
        >
          <Ionicons name={item.status === 1 ? 'eye-off-outline' : 'eye-outline'} size={15} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>{item.status === 1 ? '下架' : '上架'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 16,
    marginBottom: 12,
    ...sellerShadow,
  },
  cardDanger: {
    borderColor: '#FFCCC7',
    backgroundColor: '#FFFDFD',
  },
  cardWarning: {
    borderColor: '#FFE7BA',
    backgroundColor: '#FFFCF6',
  },
  topRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: sellerColors.foreground,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: sellerColors.muted,
  },
  priceRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: sellerColors.primary,
  },
  unit: {
    marginLeft: 4,
    marginBottom: 3,
    fontSize: 12,
    color: sellerColors.muted,
    fontWeight: '600',
  },
  metaWrap: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: sellerRadius.pill,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipDanger: {
    borderColor: '#FFCCC7',
    backgroundColor: sellerColors.destructiveSoft,
  },
  metaText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  metaDangerText: {
    fontSize: 12,
    color: sellerColors.destructive,
    fontWeight: '700',
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: sellerRadius.md,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: sellerRadius.md,
    backgroundColor: sellerColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  primaryBtnDisabled: {
    backgroundColor: sellerColors.warning,
  },
  btnPressed: {
    opacity: 0.94,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
