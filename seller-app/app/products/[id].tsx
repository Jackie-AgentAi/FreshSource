import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchSellerProductById, updateSellerProduct } from '@/api/product';
import { ProductForm } from '@/components/ProductForm';
import type { SaveSellerProductPayload, SellerProduct } from '@/types/product';

export default function ProductEditPage() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<SellerProduct | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(productId) || productId <= 0) {
      setError('无效商品 ID');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await fetchSellerProductById(productId);
      if (!data) {
        setError('未找到商品');
        setProduct(null);
      } else {
        setProduct(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: '编辑商品' });
  }, [navigation]);

  const submit = (payload: SaveSellerProductPayload) => {
    if (!product) {
      return;
    }
    void (async () => {
      try {
        setSubmitting(true);
        await updateSellerProduct(product.id, payload);
        Alert.alert('保存成功', '', [
          {
            text: '好的',
            onPress: () => router.replace('/products'),
          },
        ]);
      } catch (e) {
        Alert.alert('保存失败', e instanceof Error ? e.message : '请检查输入');
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.gray}>加载中...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.link} onPress={() => void load()}>
            点此重试
          </Text>
        </View>
      ) : product ? (
        <ProductForm initial={product} submitText="保存修改" submitting={submitting} onSubmit={submit} />
      ) : (
        <View style={styles.center}>
          <Text style={styles.gray}>商品不存在</Text>
        </View>
      )}
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
  center: {
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gray: {
    color: '#6b7280',
    fontSize: 13,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  link: {
    marginTop: 10,
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
});
