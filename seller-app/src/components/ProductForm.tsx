import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SaveSellerProductPayload, SellerProduct } from '@/types/product';

type ProductFormValues = {
  category_id: string;
  name: string;
  subtitle: string;
  cover_image: string;
  images: string;
  description: string;
  price: string;
  original_price: string;
  unit: string;
  min_buy: string;
  step_buy: string;
  stock: string;
  origin_place: string;
  shelf_life: string;
  storage_method: string;
  sort_order: string;
};

export function toProductPayload(values: ProductFormValues): SaveSellerProductPayload {
  const images = values.images
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const original = values.original_price.trim();
  return {
    category_id: Number(values.category_id) || 0,
    name: values.name.trim(),
    subtitle: values.subtitle.trim(),
    cover_image: values.cover_image.trim(),
    images,
    description: values.description.trim(),
    price: Number(values.price) || 0,
    original_price: original ? Number(original) || null : null,
    unit: values.unit.trim(),
    min_buy: Number(values.min_buy) || 1,
    step_buy: Number(values.step_buy) || 1,
    stock: Number(values.stock) || 0,
    origin_place: values.origin_place.trim(),
    shelf_life: values.shelf_life.trim(),
    storage_method: values.storage_method.trim(),
    sort_order: Number(values.sort_order) || 0,
  };
}

function defaultValues(initial?: SellerProduct | null): ProductFormValues {
  return {
    category_id: initial ? String(initial.category_id) : '',
    name: initial?.name ?? '',
    subtitle: initial?.subtitle ?? '',
    cover_image: initial?.cover_image ?? '',
    images: initial?.images?.join(', ') ?? '',
    description: initial?.description ?? '',
    price: initial ? String(initial.price) : '',
    original_price: initial?.original_price != null ? String(initial.original_price) : '',
    unit: initial?.unit ?? '',
    min_buy: initial ? String(initial.min_buy) : '1',
    step_buy: initial ? String(initial.step_buy) : '1',
    stock: initial ? String(initial.stock) : '0',
    origin_place: initial?.origin_place ?? '',
    shelf_life: initial?.shelf_life ?? '',
    storage_method: initial?.storage_method ?? '',
    sort_order: initial ? String(initial.sort_order) : '0',
  };
}

export function ProductForm({
  initial,
  submitText,
  submitting,
  onSubmit,
}: {
  initial?: SellerProduct | null;
  submitText: string;
  submitting?: boolean;
  onSubmit: (payload: SaveSellerProductPayload) => void;
}) {
  const { control, handleSubmit } = useForm<ProductFormValues>({
    defaultValues: defaultValues(initial),
  });

  return (
    <View style={styles.form}>
      <Field control={control} name="name" label="商品名称" placeholder="必填" />
      <Field control={control} name="category_id" label="分类ID" placeholder="数字" keyboardType="number-pad" />
      <Field control={control} name="cover_image" label="封面图 URL" placeholder="必填" />
      <Field control={control} name="price" label="售价" placeholder="数字" keyboardType="decimal-pad" />
      <Field control={control} name="stock" label="库存" placeholder="整数" keyboardType="number-pad" />
      <Field control={control} name="unit" label="单位" placeholder="如：斤/盒" />
      <Field control={control} name="subtitle" label="副标题" />
      <Field control={control} name="images" label="图片列表" placeholder="多个 URL 用逗号分隔" />
      <Field control={control} name="description" label="描述" multiline />
      <Field control={control} name="original_price" label="划线价" keyboardType="decimal-pad" />
      <Field control={control} name="min_buy" label="起购量" keyboardType="decimal-pad" />
      <Field control={control} name="step_buy" label="步长" keyboardType="decimal-pad" />
      <Field control={control} name="origin_place" label="产地" />
      <Field control={control} name="shelf_life" label="保质期" />
      <Field control={control} name="storage_method" label="储存方式" />
      <Field control={control} name="sort_order" label="排序" keyboardType="number-pad" />

      <Pressable
        style={[styles.submit, submitting && styles.submitDisabled]}
        disabled={!!submitting}
        onPress={handleSubmit((values) => onSubmit(toProductPayload(values)))}
      >
        <Text style={styles.submitText}>{submitting ? '提交中...' : submitText}</Text>
      </Pressable>
    </View>
  );
}

function Field({
  control,
  name,
  label,
  placeholder,
  keyboardType,
  multiline,
}: {
  control: any;
  name: keyof ProductFormValues;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TextInput
            style={[styles.input, multiline ? styles.inputMulti : null]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            keyboardType={keyboardType || 'default'}
            multiline={!!multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    padding: 16,
    paddingBottom: 28,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  inputMulti: {
    minHeight: 88,
  },
  submit: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    paddingVertical: 12,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
