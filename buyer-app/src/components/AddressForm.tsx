import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { FlatList, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { SaveAddressPayload, UserAddress } from '@/types/address';
import { colors, elevation, lineHeight, radius, spacing, typography } from '@/theme/tokens';

export type AddressFormValues = SaveAddressPayload;

type RegionOption = {
  province: string;
  cities: Array<{
    city: string;
    districts: string[];
  }>;
};

const REGION_OPTIONS: RegionOption[] = [
  {
    province: '北京市',
    cities: [{ city: '北京市', districts: ['朝阳区', '海淀区', '丰台区', '通州区', '昌平区'] }],
  },
  {
    province: '上海市',
    cities: [{ city: '上海市', districts: ['浦东新区', '闵行区', '徐汇区', '静安区', '宝山区'] }],
  },
  { province: '天津市', cities: [{ city: '天津市', districts: ['和平区', '河西区', '南开区', '滨海新区', '武清区'] }] },
  { province: '重庆市', cities: [{ city: '重庆市', districts: ['渝中区', '江北区', '南岸区', '九龙坡区', '渝北区'] }] },
  { province: '河北省', cities: [{ city: '石家庄市', districts: ['长安区', '桥西区', '新华区', '裕华区', '藁城区'] }] },
  { province: '山西省', cities: [{ city: '太原市', districts: ['小店区', '迎泽区', '杏花岭区', '万柏林区', '晋源区'] }] },
  { province: '内蒙古自治区', cities: [{ city: '呼和浩特市', districts: ['新城区', '回民区', '玉泉区', '赛罕区', '土默特左旗'] }] },
  { province: '辽宁省', cities: [{ city: '沈阳市', districts: ['和平区', '沈河区', '铁西区', '皇姑区', '浑南区'] }] },
  { province: '吉林省', cities: [{ city: '长春市', districts: ['南关区', '宽城区', '朝阳区', '二道区', '绿园区'] }] },
  { province: '黑龙江省', cities: [{ city: '哈尔滨市', districts: ['道里区', '南岗区', '道外区', '香坊区', '松北区'] }] },
  { province: '江苏省', cities: [{ city: '南京市', districts: ['玄武区', '鼓楼区', '秦淮区', '建邺区', '栖霞区'] }] },
  { province: '浙江省', cities: [{ city: '杭州市', districts: ['西湖区', '余杭区', '滨江区', '拱墅区', '上城区'] }] },
  { province: '安徽省', cities: [{ city: '合肥市', districts: ['庐阳区', '蜀山区', '包河区', '瑶海区', '肥东县'] }] },
  { province: '福建省', cities: [{ city: '福州市', districts: ['鼓楼区', '台江区', '仓山区', '晋安区', '长乐区'] }] },
  { province: '江西省', cities: [{ city: '南昌市', districts: ['东湖区', '西湖区', '青云谱区', '青山湖区', '红谷滩区'] }] },
  { province: '山东省', cities: [{ city: '济南市', districts: ['历下区', '市中区', '槐荫区', '天桥区', '历城区'] }] },
  { province: '河南省', cities: [{ city: '郑州市', districts: ['中原区', '二七区', '金水区', '管城回族区', '惠济区'] }] },
  { province: '湖北省', cities: [{ city: '武汉市', districts: ['江岸区', '武昌区', '洪山区', '汉阳区', '硚口区'] }] },
  { province: '湖南省', cities: [{ city: '长沙市', districts: ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区'] }] },
  { province: '广东省', cities: [{ city: '广州市', districts: ['天河区', '白云区', '黄埔区', '海珠区', '番禺区'] }] },
  { province: '广西壮族自治区', cities: [{ city: '南宁市', districts: ['青秀区', '兴宁区', '江南区', '西乡塘区', '良庆区'] }] },
  { province: '海南省', cities: [{ city: '海口市', districts: ['秀英区', '龙华区', '琼山区', '美兰区', '澄迈县'] }] },
  { province: '四川省', cities: [{ city: '成都市', districts: ['锦江区', '青羊区', '武侯区', '成华区', '高新区'] }] },
  { province: '贵州省', cities: [{ city: '贵阳市', districts: ['南明区', '云岩区', '花溪区', '白云区', '观山湖区'] }] },
  { province: '云南省', cities: [{ city: '昆明市', districts: ['五华区', '盘龙区', '官渡区', '西山区', '呈贡区'] }] },
  { province: '西藏自治区', cities: [{ city: '拉萨市', districts: ['城关区', '堆龙德庆区', '达孜区', '林周县', '曲水县'] }] },
  { province: '陕西省', cities: [{ city: '西安市', districts: ['新城区', '碑林区', '莲湖区', '雁塔区', '未央区'] }] },
  { province: '甘肃省', cities: [{ city: '兰州市', districts: ['城关区', '七里河区', '西固区', '安宁区', '红古区'] }] },
  { province: '青海省', cities: [{ city: '西宁市', districts: ['城中区', '城东区', '城西区', '城北区', '湟中区'] }] },
  { province: '宁夏回族自治区', cities: [{ city: '银川市', districts: ['兴庆区', '金凤区', '西夏区', '永宁县', '贺兰县'] }] },
  { province: '新疆维吾尔自治区', cities: [{ city: '乌鲁木齐市', districts: ['天山区', '沙依巴克区', '新市区', '水磨沟区', '头屯河区'] }] },
  { province: '香港特别行政区', cities: [{ city: '香港', districts: ['中西区', '湾仔区', '东区', '油尖旺区', '沙田区'] }] },
  { province: '澳门特别行政区', cities: [{ city: '澳门', districts: ['花地玛堂区', '圣安多尼堂区', '大堂区', '望德堂区', '风顺堂区'] }] },
  { province: '台湾省', cities: [{ city: '台北市', districts: ['中正区', '大同区', '中山区', '松山区', '信义区'] }] },
];

type PickerLevel = 'province' | 'city' | 'district';

type Props = {
  initial?: UserAddress | null;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: AddressFormValues) => void;
};

export function AddressForm({ initial, submitting, submitLabel, onSubmit }: Props) {
  const { control, handleSubmit, setValue } = useForm<AddressFormValues>({
    defaultValues: {
      contact_name: initial?.contact_name ?? '',
      contact_phone: initial?.contact_phone ?? '',
      province: initial?.province ?? '',
      city: initial?.city ?? '',
      district: initial?.district ?? '',
      detail_address: initial?.detail_address ?? '',
      is_default: initial?.is_default === 1 ? 1 : 0,
      tag: initial?.tag ?? '',
    },
  });
  const [pickerLevel, setPickerLevel] = useState<PickerLevel | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const selectedProvince = useWatch({ control, name: 'province' });
  const selectedCity = useWatch({ control, name: 'city' });
  const selectedDistrict = useWatch({ control, name: 'district' });
  const cityOptions = useMemo(() => {
    const match = REGION_OPTIONS.find((item) => item.province === selectedProvince);
    return match?.cities ?? [];
  }, [selectedProvince]);
  const districtOptions = useMemo(() => {
    const match = cityOptions.find((item) => item.city === selectedCity);
    return match?.districts ?? [];
  }, [cityOptions, selectedCity]);
  const pickerTitle = useMemo(() => {
    if (pickerLevel === 'province') {
      return '选择省份';
    }
    if (pickerLevel === 'city') {
      return '选择城市';
    }
    return '选择区 / 县';
  }, [pickerLevel]);
  const pickerOptions = useMemo(() => {
    if (pickerLevel === 'province') {
      return REGION_OPTIONS.map((item) => item.province);
    }
    if (pickerLevel === 'city') {
      return cityOptions.map((item) => item.city);
    }
    if (pickerLevel === 'district') {
      return districtOptions;
    }
    return [];
  }, [cityOptions, districtOptions, pickerLevel]);
  const filteredPickerOptions = useMemo(() => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      return pickerOptions;
    }
    return pickerOptions.filter((item) => item.includes(keyword));
  }, [pickerOptions, searchKeyword]);

  useEffect(() => {
    if (!selectedProvince) {
      if (selectedCity) {
        setValue('city', '');
      }
      if (selectedDistrict) {
        setValue('district', '');
      }
      return;
    }
    if (selectedCity && !cityOptions.some((item) => item.city === selectedCity)) {
      setValue('city', '');
    }
    if (selectedDistrict && !districtOptions.includes(selectedDistrict)) {
      setValue('district', '');
    }
  }, [cityOptions, districtOptions, selectedCity, selectedDistrict, selectedProvince, setValue]);

  const openPicker = (level: PickerLevel) => {
    if (level === 'city' && !selectedProvince) {
      return;
    }
    if (level === 'district' && !selectedCity) {
      return;
    }
    setSearchKeyword('');
    setPickerLevel(level);
  };

  const closePicker = () => {
    setPickerLevel(null);
    setSearchKeyword('');
  };

  const handlePickOption = (option: string) => {
    if (pickerLevel === 'province') {
      setValue('province', option, { shouldValidate: true });
      setValue('city', '', { shouldValidate: true });
      setValue('district', '', { shouldValidate: true });
    } else if (pickerLevel === 'city') {
      setValue('city', option, { shouldValidate: true });
      setValue('district', '', { shouldValidate: true });
    } else if (pickerLevel === 'district') {
      setValue('district', option, { shouldValidate: true });
    }
    closePicker();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>联系人信息</Text>
        <Text style={styles.label}>收货人</Text>
        <Controller
          control={control}
          name="contact_name"
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="请输入收货人姓名"
              placeholderTextColor={colors.textDisabled}
            />
          )}
        />
        <Text style={styles.label}>手机号</Text>
        <Controller
          control={control}
          name="contact_phone"
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="请输入手机号"
              placeholderTextColor={colors.textDisabled}
              keyboardType="phone-pad"
              maxLength={11}
            />
          )}
        />
        <Text style={styles.label}>标签（可选）</Text>
        <Controller
          control={control}
          name="tag"
          render={({ field: { value, onChange } }) => (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="如：公司 / 分店 / 仓库"
              placeholderTextColor={colors.textDisabled}
            />
          )}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>地址信息</Text>
        <Text style={styles.label}>所在省份</Text>
        <Controller
          control={control}
          name="province"
          rules={{ required: true }}
          render={({ field: { value } }) => (
            <Pressable style={styles.selector} onPress={() => openPicker('province')}>
              <Text style={value ? styles.selectorText : styles.selectorPlaceholder}>
                {value || '请选择省份'}
              </Text>
              <Ionicons color={colors.textMuted} name="chevron-down" size={18} />
            </Pressable>
          )}
        />
        <Text style={styles.label}>所在城市</Text>
        <Controller
          control={control}
          name="city"
          rules={{ required: true }}
          render={({ field: { value } }) => (
            <Pressable
              style={[styles.selector, !selectedProvince && styles.selectorDisabled]}
              onPress={() => openPicker('city')}
            >
              <Text style={value ? styles.selectorText : styles.selectorPlaceholder}>
                {value || '请选择城市'}
              </Text>
              <Ionicons color={colors.textMuted} name="chevron-down" size={18} />
            </Pressable>
          )}
        />
        <Text style={styles.label}>区 / 县</Text>
        <Controller
          control={control}
          name="district"
          rules={{ required: true }}
          render={({ field: { value } }) => (
            <Pressable
              style={[styles.selector, !selectedCity && styles.selectorDisabled]}
              onPress={() => openPicker('district')}
            >
              <Text style={value ? styles.selectorText : styles.selectorPlaceholder}>
                {value || '请选择区 / 县'}
              </Text>
              <Ionicons color={colors.textMuted} name="chevron-down" size={18} />
            </Pressable>
          )}
        />
        <Text style={styles.label}>详细地址</Text>
        <Controller
          control={control}
          name="detail_address"
          rules={{ required: true }}
          render={({ field: { value, onChange } }) => (
            <TextInput
              style={[styles.input, styles.multiline]}
              value={value}
              onChangeText={onChange}
              placeholder="请输入街道、门牌号等详细地址"
              placeholderTextColor={colors.textDisabled}
              multiline
            />
          )}
        />
      </View>

      <View style={[styles.sectionCard, styles.switchCard]}>
        <View style={styles.row}>
          <View style={styles.switchBody}>
            <Text style={styles.labelInline}>设为默认地址</Text>
            <Text style={styles.switchHint}>下单时优先使用这条地址</Text>
          </View>
          <Controller
            control={control}
            name="is_default"
            render={({ field: { value, onChange } }) => (
              <Switch
                value={value === 1}
                onValueChange={(v) => onChange(v ? 1 : 0)}
                trackColor={{ false: colors.borderStrong, true: '#6AD38D' }}
                thumbColor={colors.surface}
              />
            )}
          />
        </View>
      </View>

      <Pressable
        style={[styles.submit, submitting && styles.submitDisabled]}
        disabled={submitting}
        onPress={handleSubmit((values) => {
          const normalizedProvince = values.province.trim();
          const normalizedCity = values.city.trim();
          onSubmit({
            ...values,
            province: normalizedProvince,
            city: normalizedCity,
            district: values.district.trim(),
          });
        })}
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>

      <Modal transparent visible={pickerLevel !== null} animationType="fade" onRequestClose={closePicker}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalMask} onPress={closePicker} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <Pressable onPress={closePicker}>
                <Text style={styles.modalCloseText}>关闭</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.modalSearch}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholder="输入关键词筛选"
              placeholderTextColor={colors.textDisabled}
            />
            <FlatList
              data={filteredPickerOptions}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable style={styles.modalOption} onPress={() => handlePickOption(item)}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.modalEmptyText}>未找到匹配项</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...elevation.sm,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    lineHeight: lineHeight.subtitle,
    color: colors.textStrong,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  labelInline: {
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
    color: colors.textStrong,
    backgroundColor: colors.surface,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  optionItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  optionItemActive: {
    borderColor: '#18A84A',
    backgroundColor: '#EAF6ED',
  },
  optionText: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#18A84A',
    fontWeight: '700',
  },
  optionHint: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchCard: {
    paddingVertical: spacing.md,
  },
  switchBody: {
    flex: 1,
    paddingRight: spacing.md,
  },
  switchHint: {
    marginTop: spacing.xxs,
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
  },
  submit: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: '#18A84A',
    minHeight: 54,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.md,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: typography.body,
    lineHeight: lineHeight.body,
  },
});
