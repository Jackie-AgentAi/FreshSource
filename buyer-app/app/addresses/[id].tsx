import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { deleteAddress, fetchAddresses, updateAddress } from '@/api/address';
import { AddressForm, type AddressFormValues } from '@/components/AddressForm';
import { PageContainer } from '@/components/PageContainer';
import type { UserAddress } from '@/types/address';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function AddressEditScreen() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<UserAddress | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const list = await fetchAddresses();
    const row = list.find((a) => String(a.id) === id);
    setInitial(row ?? null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = useCallback(() => {
    if (!initial) {
      return;
    }
    Alert.alert('删除地址', '确定删除？', [
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
    navigation.setOptions({
      title: '编辑地址',
      headerRight: () =>
        initial ? (
          <Pressable onPress={onDelete} hitSlop={12} style={{ marginRight: spacing.md }}>
            <Text style={styles.delHeader}>删除</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, initial, onDelete]);

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
        <Text style={styles.hint}>加载中…</Text>
      </PageContainer>
    );
  }

  if (initial === null) {
    return (
      <PageContainer>
        <Text style={styles.hint}>地址不存在</Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AddressForm
          key={initial.id}
          initial={initial}
          submitLabel="保存修改"
          onSubmit={onSubmit}
          submitting={submitting}
        />
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 48,
  },
  hint: {
    padding: spacing.lg,
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  delHeader: {
    color: colors.danger,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
