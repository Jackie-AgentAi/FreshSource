import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';

import { fetchSellerShop, updateSellerShop, updateSellerShopStatus } from '@/api/shop';
import { uploadImageAsset } from '@/api/upload';
import { SellerImageUploadField } from '@/components/SellerImageUploadField';
import { SellerScreenHeader } from '@/components/SellerScreenHeader';
import { SellerStatusBadge } from '@/components/SellerStatusBadge';
import { sellerColors, sellerRadius, sellerShadow } from '@/theme/seller';
import type { SellerShopDetail, SellerShopFormPayload } from '@/types/shop';
import { confirmChanges } from '@/utils/confirmChanges';

type ShopFormValues = {
  shop_name: string;
  logo: string;
  description: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  business_license: string;
  latitude: string;
  longitude: string;
};

function emptyForm(): ShopFormValues {
  return {
    shop_name: '',
    logo: '',
    description: '',
    contact_phone: '',
    province: '',
    city: '',
    district: '',
    address: '',
    business_license: '',
    latitude: '',
    longitude: '',
  };
}

function formFromShop(shop: SellerShopDetail | null): ShopFormValues {
  if (!shop) return emptyForm();
  return {
    shop_name: shop.shop_name ?? '',
    logo: shop.logo ?? '',
    description: shop.description ?? '',
    contact_phone: shop.contact_phone ?? '',
    province: shop.province ?? '',
    city: shop.city ?? '',
    district: shop.district ?? '',
    address: shop.address ?? '',
    business_license: shop.business_license ?? '',
    latitude: shop.latitude == null ? '' : String(shop.latitude),
    longitude: shop.longitude == null ? '' : String(shop.longitude),
  };
}

function toPayload(values: ShopFormValues): SellerShopFormPayload {
  const latitude = values.latitude.trim() ? Number(values.latitude) : null;
  const longitude = values.longitude.trim() ? Number(values.longitude) : null;
  if (!values.shop_name.trim()) {
    throw new Error('店铺名称不能为空');
  }
  if (values.contact_phone.trim() && !/^1\d{10}$/.test(values.contact_phone.trim())) {
    throw new Error('请输入 11 位手机号作为联系电话');
  }
  if (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    throw new Error('纬度范围应为 -90 到 90');
  }
  if (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    throw new Error('经度范围应为 -180 到 180');
  }
  return {
    shop_name: values.shop_name.trim(),
    logo: values.logo.trim(),
    description: values.description.trim(),
    contact_phone: values.contact_phone.trim(),
    province: values.province.trim(),
    city: values.city.trim(),
    district: values.district.trim(),
    address: values.address.trim(),
    business_license: values.business_license.trim(),
    latitude,
    longitude,
  };
}

export default function ShopSettingsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'license' | null>(null);
  const [shop, setShop] = useState<SellerShopDetail | null>(null);
  const [shopStatus, setShopStatus] = useState<0 | 1>(1);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShopFormValues>({
    defaultValues: emptyForm(),
  });

  const logo = watch('logo');
  const businessLicense = watch('business_license');

  const load = useCallback(async () => {
    const data = await fetchSellerShop();
    setShop(data);
    setShopStatus((data?.status as 0 | 1) ?? 1);
    reset(formFromShop(data));
  }, [reset]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const auditLabel = useMemo(() => {
    if (!shop) return '未入驻';
    if (shop.audit_status === 1) return '审核通过';
    if (shop.audit_status === 2) return '审核拒绝';
    return '审核中';
  }, [shop]);

  const pickImage = async (target: 'logo' | 'license') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.82,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      setUploading(target);
      const url = await uploadImageAsset(result.assets[0]);
      setValue(target === 'logo' ? 'logo' : 'business_license', url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      Alert.alert('上传失败', error instanceof Error ? error.message : '请选择图片后重试');
    } finally {
      setUploading(null);
    }
  };

  const saveProfile = handleSubmit((values) => {
    let payload: SellerShopFormPayload;
    try {
      payload = toPayload(values);
    } catch (error) {
      Alert.alert('表单校验失败', error instanceof Error ? error.message : '请检查输入');
      return;
    }

    const changes = describeShopChanges(shop, payload);
    const runSave = async () => {
      try {
        setSaving(true);
        await updateSellerShop(payload);
        Alert.alert('保存成功', '店铺资料已提交，若原先已审核通过或驳回，将重新进入审核。');
        await load();
      } catch (e) {
        Alert.alert('保存失败', e instanceof Error ? e.message : '请稍后重试');
      } finally {
        setSaving(false);
      }
    };

    confirmChanges({
      title: '确认保存店铺资料',
      changes,
      emptyMessage: '当前没有需要保存的资料修改',
      onConfirm: () => void runSave(),
    });
  });

  const toggleShopStatus = useCallback(
    async (value: boolean) => {
      const next = value ? 1 : 0;
      setShopStatus(next);
      try {
        setStatusSaving(true);
        await updateSellerShopStatus(next);
      } catch (e) {
        setShopStatus((shop?.status as 0 | 1) ?? 1);
        Alert.alert('更新失败', e instanceof Error ? e.message : '营业状态更新失败');
      } finally {
        setStatusSaving(false);
      }
    },
    [shop?.status],
  );

  return (
    <View style={styles.page}>
      <SellerScreenHeader
        title="店铺设置"
        onBack={() => router.back()}
        right={
          <Text style={styles.saveTextBtn} onPress={() => void saveProfile()}>
            {saving ? '保存中...' : '保存'}
          </Text>
        }
      />

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>店铺审核状态</Text>
            <SellerStatusBadge label={auditLabel} />
          </View>
          <Text style={styles.helperText}>当前页面已接入完整店铺详情接口，保存前会提示本次变更内容。</Text>
          {shop?.audit_remark ? <Text style={styles.remark}>审核备注：{shop.audit_remark}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>营业设置</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchBody}>
              <Text style={styles.switchTitle}>营业状态</Text>
              <Text style={styles.switchHint}>关闭后买家将无法下单</Text>
            </View>
            <Switch
              value={shopStatus === 1}
              onValueChange={(value) => void toggleShopStatus(value)}
              trackColor={{ false: '#D9D9D9', true: '#8DE2C2' }}
              thumbColor={shopStatus === 1 ? sellerColors.primary : '#FFFFFF'}
              disabled={statusSaving}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>基础信息</Text>
          <Field control={control} name="shop_name" label="店铺名称" error={errors.shop_name?.message} rules={{ required: '店铺名称不能为空' }} />
          <Field
            control={control}
            name="contact_phone"
            label="联系电话"
            keyboardType="phone-pad"
            error={errors.contact_phone?.message}
            rules={{ pattern: { value: /^$|^1\d{10}$/, message: '请输入 11 位手机号' } }}
          />

          <SellerImageUploadField
            label="店铺 Logo"
            value={logo}
            uploading={uploading === 'logo'}
            onUpload={() => void pickImage('logo')}
          />
          <Field control={control} name="logo" label="Logo URL" placeholder="支持手动粘贴图片地址" />

          <SellerImageUploadField
            label="营业执照"
            value={businessLicense}
            uploading={uploading === 'license'}
            onUpload={() => void pickImage('license')}
          />
          <Field control={control} name="business_license" label="营业执照 URL" placeholder="支持手动粘贴图片地址" />
          <Field control={control} name="description" label="店铺介绍" multiline />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>地址信息</Text>
          <Field control={control} name="province" label="省" />
          <Field control={control} name="city" label="市" />
          <Field control={control} name="district" label="区/县" />
          <Field control={control} name="address" label="详细地址" multiline />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>经纬度</Text>
          <Field control={control} name="latitude" label="纬度" keyboardType="decimal-pad" error={errors.latitude?.message} />
          <Field control={control} name="longitude" label="经度" keyboardType="decimal-pad" error={errors.longitude?.message} />
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color="#AD6800" />
          <View style={styles.tipBody}>
            <Text style={styles.tipTitle}>保存说明</Text>
            <Text style={styles.tipText}>涉及名称、Logo、执照或地址等资料变更时，后端会按既有规则重新进入审核流程。</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  control,
  name,
  label,
  placeholder,
  multiline,
  keyboardType,
  error,
  rules,
}: {
  control: any;
  name: keyof ShopFormValues;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'phone-pad';
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
            value={value}
            onChangeText={onChange}
            multiline={!!multiline}
            keyboardType={keyboardType ?? 'default'}
            placeholder={placeholder}
            placeholderTextColor={sellerColors.muted}
            style={[styles.input, multiline ? styles.inputMulti : null, error ? styles.inputError : null]}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function describeShopChanges(shop: SellerShopDetail | null, payload: SellerShopFormPayload): string[] {
  if (!shop) {
    return ['将提交新的店铺资料。'];
  }
  const changes: string[] = [];
  if (shop.shop_name !== payload.shop_name) changes.push(`店铺名称：${shop.shop_name || '-'} -> ${payload.shop_name || '-'}`);
  if ((shop.logo ?? '') !== payload.logo) changes.push('店铺 Logo 已更新');
  if ((shop.business_license ?? '') !== payload.business_license) changes.push('营业执照已更新');
  if ((shop.contact_phone ?? '') !== payload.contact_phone) changes.push(`联系电话：${shop.contact_phone || '-'} -> ${payload.contact_phone || '-'}`);
  if ((shop.description ?? '') !== payload.description) changes.push('店铺介绍已更新');
  if ((shop.province ?? '') !== payload.province || (shop.city ?? '') !== payload.city || (shop.district ?? '') !== payload.district || (shop.address ?? '') !== payload.address) changes.push('店铺地址已更新');
  if ((shop.latitude ?? null) !== (payload.latitude ?? null) || (shop.longitude ?? null) !== (payload.longitude ?? null)) changes.push('经纬度已更新');
  return changes;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: sellerColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  saveTextBtn: {
    color: sellerColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: sellerColors.card,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    padding: 16,
    marginBottom: 14,
    ...sellerShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666666',
  },
  remark: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: sellerColors.destructive,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchBody: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  switchHint: {
    marginTop: 4,
    fontSize: 12,
    color: sellerColors.muted,
  },
  field: {
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 6,
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
  inputError: {
    borderColor: sellerColors.destructive,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: sellerColors.destructive,
  },
  inputMulti: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  imageBlock: {
    marginTop: 14,
    borderRadius: sellerRadius.md,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: '#FAFAFA',
    padding: 12,
  },
  imageBlockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  previewImage: {
    marginTop: 10,
    width: '100%',
    height: 150,
    borderRadius: sellerRadius.md,
    backgroundColor: '#F3F4F6',
  },
  previewEmpty: {
    marginTop: 10,
    width: '100%',
    height: 110,
    borderRadius: sellerRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    backgroundColor: sellerColors.warningSoft,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: '#FFE7BA',
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  tipBody: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#AD6800',
  },
  tipText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#8C6D1F',
  },
  pressed: {
    opacity: 0.92,
  },
});
