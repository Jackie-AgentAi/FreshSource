import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createAddress } from '@/api/address';
import { AppHeader } from '@/components/AppHeader';
import { AddressForm, type AddressFormValues } from '@/components/AddressForm';
import { PageContainer } from '@/components/PageContainer';
import { spacing } from '@/theme/tokens';

export function BuyerAddressCreateScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const onSubmit = (values: AddressFormValues) => {
    void (async () => {
      try {
        setSubmitting(true);
        await createAddress(values);
        Alert.alert('已保存', '', [
          {
            text: '好的',
            onPress: () => router.back(),
          },
        ]);
      } catch (e) {
        Alert.alert('保存失败', e instanceof Error ? e.message : '请检查表单');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <PageContainer>
      <AppHeader title="新增收货地址" subtitle="用于订单配送与默认收货" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 48 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AddressForm submitLabel="保存地址" onSubmit={onSubmit} submitting={submitting} />
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.sm,
  },
});
