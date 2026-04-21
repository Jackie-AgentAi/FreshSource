import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAddress, fetchAddresses, setDefaultAddress } from '@/api/address';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import { useCheckoutDraftStore } from '@/store/checkoutDraft';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';
import type { UserAddress } from '@/types/address';
import { formatAddressLine } from '@/utils/address';

function maskPhone(phone: string): string {
  if (phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function BuyerAddressListScreen() {
  const insets = useSafeAreaInsets();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const pickMode = pick === '1';

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [addresses, setAddresses] = useState<UserAddress[]>([]);

  const sortedAddresses = useMemo(
    () => [...addresses].sort((a, b) => Number(b.is_default) - Number(a.is_default)),
    [addresses],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const next = await fetchAddresses();
      setAddresses(next);
    } catch (error) {
      setAddresses([]);
      setErrorMessage(error instanceof Error ? error.message : '地址加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDelete = (item: UserAddress) => {
    Alert.alert('删除地址', '确定删除这个收货地址吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteAddress(item.id);
              await load();
            } catch (error) {
              Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试');
            }
          })();
        },
      },
    ]);
  };

  const handleSetDefault = async (item: UserAddress) => {
    try {
      await setDefaultAddress(item.id);
      await load();
    } catch (error) {
      Alert.alert('设置失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const handlePick = (item: UserAddress) => {
    useCheckoutDraftStore.getState().setAddressId(item.id);
    router.back();
  };

  if (loading && addresses.length === 0) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (errorMessage && addresses.length === 0) {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>{pickMode ? '选择地址' : '收货地址'}</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {sortedAddresses.length === 0 ? (
          <EmptyState title="暂无地址" description="新增一个收货地址吧" />
        ) : (
          sortedAddresses.map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => (pickMode ? handlePick(item) : undefined)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <Ionicons color="#18A84A" name="location-outline" size={34} style={styles.locationIcon} />
                <View style={styles.cardBody}>
                  <View style={styles.identityRow}>
                    <Text style={styles.name}>{item.contact_name}</Text>
                    <Text style={styles.phone}>{maskPhone(item.contact_phone)}</Text>
                    {item.tag ? (
                      <View style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{item.tag}</Text>
                      </View>
                    ) : null}
                    {item.is_default === 1 ? (
                      <View style={styles.defaultPill}>
                        <Text style={styles.defaultPillText}>默认</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.addressText}>{formatAddressLine(item)}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.actionsRow}>
                <View style={styles.actionsLeft}>
                  <Pressable accessibilityRole="button" onPress={() => handleDelete(item)} style={styles.iconAction}>
                    <Ionicons color="#6B7280" name="trash-outline" size={28} />
                    <Text style={styles.iconActionText}>删除</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => router.push(`/addresses/${item.id}`)} style={styles.iconAction}>
                    <Ionicons color="#6B7280" name="create-outline" size={28} />
                    <Text style={styles.iconActionText}>编辑</Text>
                  </Pressable>
                </View>

                {!pickMode && item.is_default !== 1 ? (
                  <Pressable accessibilityRole="button" onPress={() => void handleSetDefault(item)} style={styles.defaultButton}>
                    <Text style={styles.defaultButtonText}>设为默认</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {!pickMode ? (
        <View style={[styles.bottomBar, { paddingBottom: spacing.lg + insets.bottom }]}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/addresses/new')} style={styles.addButton}>
            <Ionicons color={colors.surface} name="add" size={34} />
            <Text style={styles.addButtonText}>新增收货地址</Text>
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
  content: {
    padding: spacing.lg,
    backgroundColor: '#F3F6F3',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5EAE4',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    marginTop: spacing.xs,
    marginRight: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  name: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  phone: {
    fontSize: 22,
    lineHeight: 30,
    color: '#6B7280',
  },
  tagPill: {
    backgroundColor: '#E8F7ED',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagPillText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: '#18A84A',
    fontWeight: '700',
  },
  defaultPill: {
    backgroundColor: '#F59E0B',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  defaultPillText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.surface,
    fontWeight: '700',
  },
  addressText: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 28,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EDE8',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconActionText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
    fontWeight: '600',
  },
  defaultButton: {
    minWidth: 180,
    minHeight: 64,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#18A84A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  defaultButtonText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#18A84A',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E8EDE8',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  addButton: {
    minHeight: 88,
    borderRadius: 28,
    backgroundColor: '#18A84A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  addButtonText: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.surface,
    fontWeight: '700',
  },
});
