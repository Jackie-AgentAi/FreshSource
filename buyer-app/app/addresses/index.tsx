import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteAddress, fetchAddresses, setDefaultAddress } from '@/api/address';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { useCheckoutDraftStore } from '@/store/checkoutDraft';
import type { UserAddress } from '@/types/address';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatAddressLine } from '@/utils/address';

export default function AddressListScreen() {
  const navigation = useNavigation();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const pickMode = pick === '1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [list, setList] = useState<UserAddress[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const rows = await fetchAddresses();
      setList(rows);
    } catch (e) {
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pickMode ? '选择收货地址' : '收货地址',
      headerRight: () =>
        pickMode ? null : (
          <Pressable onPress={() => router.push('/addresses/new')} hitSlop={12}>
            <Text style={styles.headerBtn}>新增</Text>
          </Pressable>
        ),
    });
  }, [navigation, pickMode]);

  const onPick = (row: UserAddress) => {
    useCheckoutDraftStore.getState().setAddressId(row.id);
    router.back();
  };

  const onSetDefault = (row: UserAddress) => {
    void (async () => {
      try {
        await setDefaultAddress(row.id);
        await load();
      } catch (e) {
        Alert.alert('提示', e instanceof Error ? e.message : '操作失败');
      }
    })();
  };

  const onDelete = (row: UserAddress) => {
    Alert.alert('删除地址', '确定删除该地址？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteAddress(row.id);
              await load();
            } catch (e) {
              Alert.alert('提示', e instanceof Error ? e.message : '删除失败');
            }
          })();
        },
      },
    ]);
  };

  if (loading && list.length === 0) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (error && list.length === 0) {
    return (
      <PageContainer>
        <ErrorRetryView message={error} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<EmptyState title="暂无地址" description={pickMode ? '' : '点击右上角新增'} />}
        ListFooterComponent={
          pickMode ? null : (
            <Pressable style={styles.addFooter} onPress={() => router.push('/addresses/new')}>
              <Text style={styles.addFooterText}>+ 新增收货地址</Text>
            </Pressable>
          )
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {pickMode ? (
              <Pressable onPress={() => onPick(item)} style={styles.cardMain}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.name}>
                    {item.contact_name} {item.contact_phone}
                  </Text>
                  {item.is_default === 1 ? <Text style={styles.defaultTag}>默认</Text> : null}
                </View>
                <Text style={styles.detail}>{formatAddressLine(item)}</Text>
                {item.tag ? <Text style={styles.tag}>标签：{item.tag}</Text> : null}
              </Pressable>
            ) : (
              <View style={styles.cardMain}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.name}>
                    {item.contact_name} {item.contact_phone}
                  </Text>
                  {item.is_default === 1 ? <Text style={styles.defaultTag}>默认</Text> : null}
                </View>
                <Text style={styles.detail}>{formatAddressLine(item)}</Text>
                {item.tag ? <Text style={styles.tag}>标签：{item.tag}</Text> : null}
              </View>
            )}
            {!pickMode ? (
              <View style={styles.actions}>
                <Pressable onPress={() => onSetDefault(item)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>设为默认</Text>
                </Pressable>
                <Pressable onPress={() => router.push(`/addresses/${item.id}`)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>编辑</Text>
                </Pressable>
                <Pressable onPress={() => onDelete(item)} style={styles.actionBtn}>
                  <Text style={[styles.actionText, styles.dangerText]}>删除</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '600',
    marginRight: spacing.md,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardMain: {
    padding: spacing.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  defaultTag: {
    fontSize: typography.small,
    color: colors.primary,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  detail: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tag: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  actionText: {
    fontSize: typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  dangerText: {
    color: colors.danger,
  },
  addFooter: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderStyle: 'dashed',
  },
  addFooterText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: typography.body,
  },
});
