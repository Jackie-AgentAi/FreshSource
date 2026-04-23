import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { sellerColors } from '@/theme/seller';

export function SellerScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed ? styles.pressed : null]} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={sellerColors.foreground} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: sellerColors.card,
    borderBottomWidth: 1,
    borderBottomColor: sellerColors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  right: {
    marginLeft: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pressed: {
    backgroundColor: sellerColors.secondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: sellerColors.foreground,
  },
});
