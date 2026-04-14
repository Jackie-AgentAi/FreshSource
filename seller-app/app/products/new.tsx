import { useNavigation, router } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { createSellerProduct } from '@/api/product';
import { ProductForm } from '@/components/ProductForm';
import type { SaveSellerProductPayload } from '@/types/product';

export default function ProductCreatePage() {
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: '发布商品' });
  }, [navigation]);

  const submit = (payload: SaveSellerProductPayload) => {
    void (async () => {
      try {
        setSubmitting(true);
        await createSellerProduct(payload);
        Alert.alert('发布成功', '新商品默认审核中', [
          {
            text: '好的',
            onPress: () => router.replace('/products'),
          },
        ]);
      } catch (e) {
        Alert.alert('发布失败', e instanceof Error ? e.message : '请检查输入');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <ProductForm submitText="发布商品" submitting={submitting} onSubmit={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  content: {
    paddingBottom: 30,
  },
});
