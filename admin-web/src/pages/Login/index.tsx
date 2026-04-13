import { LockOutlined, MobileOutlined } from '@ant-design/icons';
import { LoginFormPage, ProFormText } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { message } from 'antd';

import { loginByPassword } from '@/services/auth';
import { clearTokens, setAdminPhone, setTokens } from '@/utils/token';

type LoginFormValues = {
  phone: string;
  password: string;
};

export default function LoginPage() {
  return (
    <LoginFormPage<LoginFormValues>
      title="FreshMart 管理后台"
      subTitle="使用管理员账号登录"
      onFinish={async (values) => {
        const resp = await loginByPassword(values.phone, values.password);
        if (resp.code !== 0) {
          clearTokens();
          message.error(resp.message || '登录失败');
          return false;
        }
        if ((resp.data?.user?.role || 0) !== 3) {
          clearTokens();
          message.error('当前账号不是管理员');
          return false;
        }

        setTokens(resp.data.access_token, resp.data.refresh_token);
        setAdminPhone(resp.data.user.phone);
        message.success('登录成功');
        history.push('/');
        return true;
      }}
    >
      <ProFormText
        name="phone"
        fieldProps={{ size: 'large', prefix: <MobileOutlined /> }}
        placeholder="管理员手机号"
        rules={[{ required: true, message: '请输入手机号' }]}
      />
      <ProFormText.Password
        name="password"
        fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
        placeholder="密码"
        rules={[{ required: true, message: '请输入密码' }]}
      />
    </LoginFormPage>
  );
}
