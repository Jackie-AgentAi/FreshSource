import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { createAddress } from '@/api/address';
import { AddressForm, type AddressFormValues } from '@/components/AddressForm';
import { PageContainer } from '@/components/PageContainer';

export default function AddressNewScreen() {
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: '新增地址' });
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AddressForm submitLabel="保存" onSubmit={onSubmit} submitting={submitting} />
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 48,
  },
});
