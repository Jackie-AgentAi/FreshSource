import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { loginByPassword } from '@/api/auth';
import { BUSINESS_SUCCESS_CODE } from '@/constants/api';
import { useAuthStore } from '@/store/auth';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

type LoginForm = {
  phone: string;
  password: string;
};

export default function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState, setError } = useForm<LoginForm>({
    defaultValues: {
      phone: '13800002222',
      password: 'abc12345',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      const resp = await loginByPassword(values.phone.trim(), values.password);
      if (resp.code !== BUSINESS_SUCCESS_CODE) {
        setError('root', { message: resp.message || '登录失败' });
        return;
      }
      if ((resp.data?.user?.role || 0) !== 1) {
        setError('root', { message: '当前账号不是订货端账号' });
        return;
      }

      await setAuth({
        accessToken: resp.data.access_token,
        refreshToken: resp.data.refresh_token,
        phone: resp.data.user.phone,
        role: resp.data.user.role,
      });
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>FreshMart</Text>
        <Text style={styles.title}>订货端登录</Text>
        <Text style={styles.subTitle}>快速进入采购工作台与下单流程</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>手机号</Text>
        <Controller
          control={control}
          name="phone"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={value}
              onChangeText={onChange}
              placeholder="请输入手机号"
              placeholderTextColor={colors.textMuted}
            />
          )}
        />

        <Text style={styles.label}>密码</Text>
        <Controller
          control={control}
          name="password"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              secureTextEntry
              value={value}
              onChangeText={onChange}
              placeholder="请输入密码"
              placeholderTextColor={colors.textMuted}
            />
          )}
        />

        {formState.errors.root?.message ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>登录失败</Text>
            <Text style={styles.error}>{formState.errors.root.message}</Text>
          </View>
        ) : null}

        <Pressable style={[styles.button, submitting ? styles.buttonDisabled : null]} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? '登录中...' : '登录'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  brand: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.h2,
    lineHeight: lineHeight.h2,
    fontWeight: '700',
    color: colors.textStrong,
  },
  subTitle: {
    marginTop: spacing.xs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: {
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  input: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
    color: colors.textStrong,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.body,
    lineHeight: lineHeight.body,
  },
  errorBox: {
    backgroundColor: colors.statusDangerBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.statusDangerText,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.statusDangerText,
    fontWeight: '700',
  },
  error: {
    marginTop: spacing.xxs,
    fontSize: typography.small,
    lineHeight: lineHeight.small,
    color: colors.statusDangerText,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.surface,
    fontSize: typography.caption,
    lineHeight: lineHeight.caption,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
