import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { loginByPassword } from '@/api/auth';
import { BUSINESS_SUCCESS_CODE } from '@/constants/api';
import { useAuthStore } from '@/store/auth';

type LoginForm = {
  phone: string;
  password: string;
};

export default function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, formState, setError } = useForm<LoginForm>({
    defaultValues: {
      phone: '13800003333',
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
      if ((resp.data?.user?.role || 0) !== 2) {
        setError('root', { message: '当前账号不是发货端账号' });
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
      <Text style={styles.title}>FreshMart 发货端登录</Text>

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
          />
        )}
      />

      {formState.errors.root?.message ? (
        <Text style={styles.error}>{formState.errors.root.message}</Text>
      ) : null}

      <Pressable style={[styles.button, submitting ? styles.buttonDisabled : null]} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? '登录中...' : '登录'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  error: {
    color: '#cf1322',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1677ff',
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
