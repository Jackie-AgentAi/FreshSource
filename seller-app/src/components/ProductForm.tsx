import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';

import { fetchSellerCategoryTree } from '@/api/category';
import { uploadImageAsset, uploadImageAssets } from '@/api/upload';
import { SellerCollapsibleSection } from '@/components/SellerCollapsibleSection';
import { SellerImageUploadField } from '@/components/SellerImageUploadField';
import { sellerColors, sellerRadius } from '@/theme/seller';
import type { SellerCategoryOption, SellerCategoryTreeNode } from '@/types/category';
import type { SaveSellerProductPayload, SellerProduct } from '@/types/product';
import { confirmChanges } from '@/utils/confirmChanges';

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

type SectionKey = 'basic' | 'media' | 'inventory';

const SECTION_LABEL: Record<SectionKey, string> = {
  basic: '基础信息',
  media: '图片与价格',
  inventory: '库存与规格',
};

export function toProductPayload(values: ProductFormValues): SaveSellerProductPayload {
  const images = parseImageList(values.images);
  const price = Number(values.price);
  const original = values.original_price.trim();
  const originalPrice = original ? Number(original) : null;
  const minBuy = Number(values.min_buy);
  const stepBuy = Number(values.step_buy);
  const stock = Number(values.stock);

  if (!values.name.trim()) {
    throw new Error('商品名称不能为空');
  }
  if (Number(values.category_id) <= 0) {
    throw new Error('请选择商品分类');
  }
  if (!values.cover_image.trim()) {
    throw new Error('请上传商品封面图');
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('售价必须大于 0');
  }
  if (original && (!Number.isFinite(originalPrice) || (originalPrice ?? 0) < price)) {
    throw new Error('划线价不能小于售价');
  }
  if (!Number.isFinite(minBuy) || minBuy <= 0) {
    throw new Error('起购量必须大于 0');
  }
  if (!Number.isFinite(stepBuy) || stepBuy <= 0) {
    throw new Error('步长必须大于 0');
  }
  if (!Number.isFinite(stock) || stock < 0) {
    throw new Error('库存不能小于 0');
  }
  if (images.length > 9) {
    throw new Error('商品图片最多 9 张');
  }

  return {
    category_id: Number(values.category_id) || 0,
    name: values.name.trim(),
    subtitle: values.subtitle.trim(),
    cover_image: values.cover_image.trim(),
    images,
    description: values.description.trim(),
    price,
    original_price: original ? originalPrice : null,
    unit: values.unit.trim(),
    min_buy: minBuy,
    step_buy: stepBuy,
    stock,
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
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    basic: true,
    media: true,
    inventory: !initial,
  });
  const [uploading, setUploading] = useState<'cover' | 'gallery' | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<SellerCategoryOption[]>([]);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: defaultValues(initial),
  });

  useEffect(() => {
    reset(defaultValues(initial));
  }, [initial, reset]);

  const coverImage = watch('cover_image');
  const galleryValue = watch('images');
  const categoryId = watch('category_id');
  const galleryImages = useMemo(() => parseImageList(galleryValue), [galleryValue]);
  const selectedCategory = useMemo(
    () => categoryOptions.find((item) => item.id === Number(categoryId)),
    [categoryId, categoryOptions],
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const tree = await fetchSellerCategoryTree();
        if (mounted) {
          setCategoryOptions(flattenCategoryOptions(tree));
        }
      } catch {
        if (mounted) {
          setCategoryOptions([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleSection = (key: SectionKey) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      setUploading('cover');
      const url = await uploadImageAsset(result.assets[0]);
      setValue('cover_image', url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      Alert.alert('上传失败', error instanceof Error ? error.message : '请选择图片后重试');
    } finally {
      setUploading(null);
    }
  };

  const pickGalleryImages = async () => {
    try {
      if (galleryImages.length >= 9) {
        Alert.alert('提示', '商品图片最多 9 张');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 9 - galleryImages.length,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      setUploading('gallery');
      const urls =
        result.assets.length === 1
          ? [await uploadImageAsset(result.assets[0])]
          : await uploadImageAssets(result.assets);
      setValue('images', [...galleryImages, ...urls].join(', '), { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      Alert.alert('上传失败', error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setUploading(null);
    }
  };

  const removeGalleryImage = (url: string) => {
    setValue(
      'images',
      galleryImages.filter((item) => item !== url).join(', '),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const submitForm = handleSubmit((values) => {
    try {
      const payload = toProductPayload(values);
      if (initial) {
        const changes = describeProductChanges(initial, payload);
        confirmChanges({
          title: '确认保存修改',
          changes,
          onConfirm: () => onSubmit(payload),
        });
        return;
      }
      onSubmit(payload);
    } catch (error) {
      Alert.alert('表单校验失败', error instanceof Error ? error.message : '请检查输入项');
    }
  });

  return (
    <View style={styles.form}>
      <SellerCollapsibleSection
        title={SECTION_LABEL.basic}
        expanded={expanded.basic}
        onToggle={() => toggleSection('basic')}
        description="先补齐商品名称、分类和对外展示信息。"
      >
        <Field
          control={control}
          name="name"
          label="商品名称"
          placeholder="必填，例如：云南生菜"
          error={errors.name?.message}
          rules={{
            required: '请输入商品名称',
            maxLength: { value: 50, message: '商品名称不超过 50 个字' },
          }}
        />
        <Field control={control} name="subtitle" label="副标题" placeholder="例如：当天直采、新鲜到店" />
        <CategorySelector
          selectedLabel={selectedCategory ? `${selectedCategory.parent_label ? `${selectedCategory.parent_label} / ` : ''}${selectedCategory.label}` : ''}
          selectedId={categoryId}
          onOpen={() => setCategoryPickerVisible(true)}
        />
        <Field
          control={control}
          name="unit"
          label="单位"
          placeholder="如：斤 / 箱 / 盒"
          error={errors.unit?.message}
          rules={{
            required: '请输入单位',
            maxLength: { value: 10, message: '单位不超过 10 个字' },
          }}
        />
        <Field control={control} name="description" label="商品描述" multiline placeholder="补充产地、规格、口感等卖点" />
      </SellerCollapsibleSection>

      <SellerCollapsibleSection
        title={SECTION_LABEL.media}
        expanded={expanded.media}
        onToggle={() => toggleSection('media')}
        description="支持从相册上传图片，也可以手动粘贴 URL。"
      >
        <SellerImageUploadField
          label="封面图"
          value={coverImage}
          helperText="封面图为必填，建议使用清晰的正方形图片。"
          uploading={uploading === 'cover'}
          buttonText={uploading === 'cover' ? '上传中...' : '上传封面'}
          onUpload={() => void pickCoverImage()}
        />
        <Field
          control={control}
          name="cover_image"
          label="封面图 URL"
          placeholder="支持手动粘贴图片地址"
          error={errors.cover_image?.message}
          rules={{ required: '请上传或填写封面图地址' }}
        />

        <View style={styles.gallerySection}>
          <View style={styles.galleryHeader}>
            <Text style={styles.label}>商品图片</Text>
            <Pressable style={({ pressed }) => [styles.uploadGhostBtn, pressed ? styles.pressed : null]} onPress={() => void pickGalleryImages()}>
              <Ionicons name="images-outline" size={16} color={sellerColors.primary} />
              <Text style={styles.uploadGhostText}>{uploading === 'gallery' ? '上传中...' : '添加图片'}</Text>
            </Pressable>
          </View>
          {galleryImages.length > 0 ? (
            <View style={styles.galleryGrid}>
              {galleryImages.map((url) => (
                <View key={url} style={styles.galleryItem}>
                  <Image source={{ uri: url }} style={styles.galleryImage} />
                  <Pressable style={styles.galleryRemove} onPress={() => removeGalleryImage(url)}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helperText}>可选，最多 9 张，用于详情页轮播和卖点展示。</Text>
          )}
        </View>

        <Field control={control} name="images" label="图片列表 URL" placeholder="多个 URL 用逗号分隔" />
        <Field
          control={control}
          name="price"
          label="售价"
          placeholder="请输入大于 0 的数字"
          keyboardType="decimal-pad"
          error={errors.price?.message}
          rules={{
            validate: (value: string) => (Number(value) > 0 ? true : '请输入有效售价'),
          }}
        />
        <Field
          control={control}
          name="original_price"
          label="划线价"
          placeholder="可选，需大于等于售价"
          keyboardType="decimal-pad"
        />
      </SellerCollapsibleSection>

      <SellerCollapsibleSection
        title={SECTION_LABEL.inventory}
        expanded={expanded.inventory}
        onToggle={() => toggleSection('inventory')}
        description="这里决定库存、起购门槛和排序方式。"
      >
        <Field
          control={control}
          name="stock"
          label="库存"
          placeholder="请输入整数"
          keyboardType="number-pad"
          error={errors.stock?.message}
          rules={{
            validate: (value: string) => (Number(value) >= 0 ? true : '库存不能小于 0'),
          }}
        />
        <Field
          control={control}
          name="min_buy"
          label="起购量"
          keyboardType="decimal-pad"
          error={errors.min_buy?.message}
          rules={{
            validate: (value: string) => (Number(value) > 0 ? true : '起购量必须大于 0'),
          }}
        />
        <Field
          control={control}
          name="step_buy"
          label="步长"
          keyboardType="decimal-pad"
          error={errors.step_buy?.message}
          rules={{
            validate: (value: string) => (Number(value) > 0 ? true : '步长必须大于 0'),
          }}
        />
        <Field control={control} name="origin_place" label="产地" placeholder="如：云南昆明" />
        <Field control={control} name="shelf_life" label="保质期" placeholder="如：7 天" />
        <Field control={control} name="storage_method" label="储存方式" placeholder="如：0-4℃ 冷藏" />
        <Field control={control} name="sort_order" label="排序值" placeholder="数字越小越靠前" keyboardType="number-pad" />
      </SellerCollapsibleSection>

      <Pressable
        style={[styles.submit, submitting && styles.submitDisabled]}
        disabled={!!submitting}
        onPress={submitForm}
      >
        <Text style={styles.submitText}>{submitting ? '提交中...' : submitText}</Text>
      </Pressable>

      <Modal transparent visible={categoryPickerVisible} animationType="fade" onRequestClose={() => setCategoryPickerVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalMask} onPress={() => setCategoryPickerVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择商品分类</Text>
              <Text style={styles.modalClose} onPress={() => setCategoryPickerVisible(false)}>关闭</Text>
            </View>
            <FlatList
              data={categoryOptions}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const active = String(item.id) === categoryId;
                return (
                  <Pressable
                    style={[styles.categoryOption, active ? styles.categoryOptionActive : null]}
                    onPress={() => {
                      setValue('category_id', String(item.id), { shouldDirty: true, shouldValidate: true });
                      setCategoryPickerVisible(false);
                    }}
                  >
                    <View style={styles.categoryOptionBody}>
                      <Text style={[styles.categoryOptionTitle, active ? styles.categoryOptionTitleActive : null]}>
                        {item.label}
                      </Text>
                      {item.parent_label ? <Text style={styles.categoryOptionMeta}>{item.parent_label}</Text> : null}
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={18} color={sellerColors.primary} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.modalEmpty}>暂无可选分类，请稍后重试</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CategorySelector({
  selectedId,
  selectedLabel,
  onOpen,
}: {
  selectedId: string;
  selectedLabel: string;
  onOpen: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>商品分类</Text>
      <Pressable style={({ pressed }) => [styles.categorySelector, pressed ? styles.pressed : null]} onPress={onOpen}>
        <View style={styles.categorySelectorBody}>
          <Text style={selectedId ? styles.categorySelectorText : styles.categorySelectorPlaceholder}>
            {selectedLabel || '请选择商品分类'}
          </Text>
          {selectedId ? <Text style={styles.categorySelectorMeta}>分类 ID：{selectedId}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={sellerColors.muted} />
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
  error,
  rules,
}: {
  control: any;
  name: keyof ProductFormValues;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  error?: string;
  rules?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field: { value, onChange } }) => (
          <TextInput
            style={[styles.input, multiline ? styles.inputMulti : null, error ? styles.inputError : null]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={sellerColors.muted}
            keyboardType={keyboardType || 'default'}
            multiline={!!multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function parseImageList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function flattenCategoryOptions(tree: SellerCategoryTreeNode[]): SellerCategoryOption[] {
  const options: SellerCategoryOption[] = [];
  tree.forEach((parent) => {
    if (parent.children.length === 0) {
      options.push({ id: parent.id, label: parent.name });
      return;
    }
    parent.children.forEach((child) => {
      options.push({
        id: child.id,
        label: child.name,
        parent_label: parent.name,
      });
    });
  });
  return options;
}

function describeProductChanges(initial: SellerProduct, payload: SaveSellerProductPayload): string[] {
  const changes: string[] = [];
  if (initial.name !== payload.name) changes.push(`商品名称：${initial.name} -> ${payload.name}`);
  if (initial.subtitle !== payload.subtitle) changes.push(`副标题已更新`);
  if (initial.category_id !== payload.category_id) changes.push(`分类 ID：${initial.category_id} -> ${payload.category_id}`);
  if (initial.cover_image !== payload.cover_image) changes.push('封面图已更新');
  if ((initial.images ?? []).join(',') !== (payload.images ?? []).join(',')) changes.push(`商品图片：${payload.images.length} 张`);
  if (initial.price !== payload.price) changes.push(`售价：${initial.price} -> ${payload.price}`);
  if ((initial.original_price ?? null) !== (payload.original_price ?? null)) changes.push('划线价已更新');
  if (initial.stock !== payload.stock) changes.push(`库存：${initial.stock} -> ${payload.stock}`);
  if (initial.min_buy !== payload.min_buy) changes.push(`起购量：${initial.min_buy} -> ${payload.min_buy}`);
  if (initial.step_buy !== payload.step_buy) changes.push(`步长：${initial.step_buy} -> ${payload.step_buy}`);
  if (initial.unit !== payload.unit) changes.push(`单位：${initial.unit} -> ${payload.unit}`);
  if (initial.origin_place !== payload.origin_place) changes.push('产地已更新');
  if (initial.shelf_life !== payload.shelf_life) changes.push('保质期已更新');
  if (initial.storage_method !== payload.storage_method) changes.push('储存方式已更新');
  if (initial.sort_order !== payload.sort_order) changes.push(`排序：${initial.sort_order} -> ${payload.sort_order}`);
  if (initial.description !== payload.description) changes.push('商品描述已更新');
  return changes;
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  section: {
    marginBottom: 14,
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  sectionDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: sellerColors.muted,
  },
  field: {
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: sellerRadius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: sellerColors.foreground,
  },
  inputMulti: {
    minHeight: 88,
  },
  inputError: {
    borderColor: sellerColors.destructive,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: sellerColors.destructive,
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: sellerRadius.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categorySelectorBody: {
    flex: 1,
  },
  categorySelectorText: {
    fontSize: 14,
    color: sellerColors.foreground,
    fontWeight: '700',
  },
  categorySelectorPlaceholder: {
    fontSize: 14,
    color: sellerColors.muted,
  },
  categorySelectorMeta: {
    marginTop: 4,
    fontSize: 11,
    color: sellerColors.muted,
  },
  mediaCard: {
    marginTop: 12,
    borderRadius: sellerRadius.md,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 12,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: sellerRadius.pill,
    backgroundColor: sellerColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: sellerRadius.pill,
    borderWidth: 1,
    borderColor: sellerColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  uploadGhostText: {
    color: sellerColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  coverPreview: {
    marginTop: 12,
    width: '100%',
    height: 180,
    borderRadius: sellerRadius.md,
    backgroundColor: '#F3F4F6',
  },
  coverPlaceholder: {
    marginTop: 12,
    width: '100%',
    height: 140,
    borderRadius: sellerRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: sellerColors.muted,
  },
  gallerySection: {
    marginTop: 14,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -4,
  },
  galleryItem: {
    width: '33.33%',
    padding: 4,
  },
  galleryImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: sellerRadius.md,
    backgroundColor: '#F3F4F6',
  },
  galleryRemove: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17, 24, 39, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: {
    marginTop: 10,
    borderRadius: sellerRadius.lg,
    backgroundColor: sellerColors.primary,
    alignItems: 'center',
    paddingVertical: 14,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.92,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  modalCard: {
    maxHeight: '72%',
    backgroundColor: sellerColors.card,
    borderTopLeftRadius: sellerRadius.xl,
    borderTopRightRadius: sellerRadius.xl,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: sellerColors.foreground,
  },
  modalClose: {
    color: sellerColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryOption: {
    borderRadius: sellerRadius.md,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryOptionActive: {
    borderColor: sellerColors.primary,
    backgroundColor: sellerColors.primarySoft,
  },
  categoryOptionBody: {
    flex: 1,
  },
  categoryOptionTitle: {
    fontSize: 14,
    color: sellerColors.foreground,
    fontWeight: '700',
  },
  categoryOptionTitleActive: {
    color: sellerColors.primary,
  },
  categoryOptionMeta: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  modalEmpty: {
    paddingVertical: 32,
    textAlign: 'center',
    fontSize: 13,
    color: sellerColors.muted,
  },
});
