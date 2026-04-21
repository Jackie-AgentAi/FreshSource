import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAddress, fetchAddresses, updateAddress } from '@/api/address';
import { AppHeader } from '@/components/AppHeader';
import { AddressForm, type AddressFormValues } from '@/components/AddressForm';
import { PageContainer } from '@/components/PageContainer';
import type { UserAddress } from '@/types/address';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

export function BuyerAddressEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<UserAddress | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const list = await fetchAddresses();
    const row = list.find((item) => String(item.id) === id);
    setInitial(row ?? null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = useCallback(() => {
    if (!initial) {
      return;
    }
    Alert.alert('删除地址', '确定删除这条收货地址吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteAddress(initial.id);
              router.back();
            } catch (e) {
              Alert.alert('提示', e instanceof Error ? e.message : '删除失败');
            }
          })();
        },
      },
    ]);
  }, [initial]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const onSubmit = (values: AddressFormValues) => {
    if (!initial) {
      return;
    }
    void (async () => {
      try {
        setSubmitting(true);
        await updateAddress(initial.id, values);
        Alert.alert('已保存', '', [{ text: '好的', onPress: () => router.back() }]);
      } catch (e) {
        Alert.alert('保存失败', e instanceof Error ? e.message : '请检查表单');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  if (initial === undefined) {
    return (
      <PageContainer>
        <AppHeader title="编辑地址" subtitle="加载地址信息中" />
        <Text style={styles.hint}>加载中…</Text>
      </PageContainer>
    );
  }

  if (initial === null) {
    return (
      <PageContainer>
        <AppHeader title="编辑地址" subtitle="未找到当前地址" />
        <Text style={styles.hint}>地址不存在</Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AppHeader
        title="编辑地址"
        subtitle="更新联系人与配送信息"
        right={
          <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteButton}>
            <Text style={styles.deleteText}>删除</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 48 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AddressForm
          initial={initial}
          key={initial.id}
          onSubmit={onSubmit}
          submitLabel="保存修改"
          submitting={submitting}
        />
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.sm,
  },
  hint: {
    padding: spacing.lg,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: colors.statusDangerBg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  deleteText: {
    color: colors.statusDangerText,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    fontWeight: '700',
  },
});
