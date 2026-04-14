import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { SaveAddressPayload, UserAddress } from '@/types/address';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export type AddressFormValues = SaveAddressPayload;

type Props = {
  initial?: UserAddress | null;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: AddressFormValues) => void;
};

export function AddressForm({ initial, submitting, submitLabel, onSubmit }: Props) {
  const { control, handleSubmit } = useForm<AddressFormValues>({
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>收货人</Text>
      <Controller
        control={control}
        name="contact_name"
        rules={{ required: true }}
        render={({ field: { value, onChange } }) => (
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="姓名" />
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
            placeholder="手机号"
            keyboardType="phone-pad"
          />
        )}
      />
      <Text style={styles.label}>省</Text>
      <Controller
        control={control}
        name="province"
        rules={{ required: true }}
        render={({ field: { value, onChange } }) => (
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="省" />
        )}
      />
      <Text style={styles.label}>市</Text>
      <Controller
        control={control}
        name="city"
        rules={{ required: true }}
        render={({ field: { value, onChange } }) => (
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="市" />
        )}
      />
      <Text style={styles.label}>区/县</Text>
      <Controller
        control={control}
        name="district"
        rules={{ required: true }}
        render={({ field: { value, onChange } }) => (
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="区/县" />
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
            placeholder="街道门牌等"
            multiline
          />
        )}
      />
      <Text style={styles.label}>标签（可选）</Text>
      <Controller
        control={control}
        name="tag"
        render={({ field: { value, onChange } }) => (
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="如：仓库" />
        )}
      />
      <View style={styles.row}>
        <Text style={styles.labelInline}>设为默认地址</Text>
        <Controller
          control={control}
          name="is_default"
          render={({ field: { value, onChange } }) => (
            <Switch
              value={value === 1}
              onValueChange={(v) => onChange(v ? 1 : 0)}
              trackColor={{ true: colors.primary }}
            />
          )}
        />
      </View>
      <Pressable
        style={[styles.submit, submitting && styles.submitDisabled]}
        disabled={submitting}
        onPress={handleSubmit(onSubmit)}
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  labelInline: {
    fontSize: typography.body,
    color: colors.text,
    flex: 1,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    justifyContent: 'space-between',
  },
  submit: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.body,
  },
});
