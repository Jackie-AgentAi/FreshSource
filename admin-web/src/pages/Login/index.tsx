import {
  LockOutlined,
  MobileOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Checkbox, Form, Input, Space, Typography, message } from 'antd';

import { loginByPassword } from '@/services/auth';
import { clearTokens, setAdminPhone, setTokens } from '@/utils/token';

type LoginFormValues = {
  phone: string;
  password: string;
  remember?: boolean;
};

const platformHighlights = [
  { label: '活跃商户', value: '10,000+' },
  { label: '日订单量', value: '50,000+' },
  { label: '准时送达率', value: '99.8%' },
  { label: '在线服务', value: '24/7' },
];

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();

  return (
    <div className="fm-login">
      <section className="fm-login__hero">
        <div className="fm-login__hero-inner">
          <Space size={16} align="start">
            <div className="fm-admin-brand__logo" style={{ width: 56, height: 56, borderRadius: 20 }}>
              <ShoppingOutlined />
            </div>
            <div>
              <Typography.Title level={1} style={{ color: '#fff', margin: 0, fontSize: 42 }}>
                FreshMart
              </Typography.Title>
              <Typography.Text style={{ color: 'rgba(255,255,255,0.82)' }}>生鲜供应链运营管理平台</Typography.Text>
            </div>
          </Space>
          <Typography.Title level={2} style={{ color: '#fff', marginTop: 42, marginBottom: 16 }}>
            连接新鲜，高效运营
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.84)', maxWidth: 540, fontSize: 18, lineHeight: 1.8 }}>
            为菜市场、餐饮商户、社区零售提供专业的 B2B 生鲜订货与供应链管理解决方案，让平台审核、订单协同和配置运营保持同一套节奏。
          </Typography.Paragraph>
          <div className="fm-login__hero-grid">
            {platformHighlights.map((item) => (
              <div key={item.label} className="fm-login__hero-card">
                <div style={{ fontSize: 32, fontWeight: 600 }}>{item.value}</div>
                <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.72)' }}>{item.label}</div>
              </div>
            ))}
          </div>
          <Space size={12} style={{ marginTop: 42, color: 'rgba(255,255,255,0.86)' }}>
            <SafetyCertificateOutlined />
            <span>新鲜直达 · 品质保证 · 高效配送</span>
          </Space>
        </div>
      </section>
      <section className="fm-login__panel">
        <Card className="fm-panel fm-login__card" bordered={false}>
          <div className="fm-login__form">
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div className="fm-admin-brand__logo" style={{ margin: '0 auto 16px', width: 52, height: 52, borderRadius: 18 }}>
                <ShoppingOutlined />
              </div>
              <Typography.Title level={2} style={{ marginBottom: 8 }}>
                欢迎登录
              </Typography.Title>
              <Typography.Text type="secondary">FreshMart 运营管理后台</Typography.Text>
            </div>
            <Form<LoginFormValues>
              form={form}
              layout="vertical"
              initialValues={{ remember: true }}
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
              <Form.Item<LoginFormValues> name="phone" label="账号" rules={[{ required: true, message: '请输入管理员手机号' }]}>
                <Input size="large" prefix={<MobileOutlined />} placeholder="请输入管理员手机号" />
              </Form.Item>
              <Form.Item<LoginFormValues> name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入密码" />
              </Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <Form.Item<LoginFormValues> name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住密码</Checkbox>
                </Form.Item>
                <Typography.Link>忘记密码？</Typography.Link>
              </div>
              <Button type="primary" size="large" htmlType="submit" block>
                登录
              </Button>
            </Form>
            <div className="fm-login__support">
              <Typography.Text type="secondary">
                需要帮助？联系客服 <PhoneOutlined /> 400-888-8888
              </Typography.Text>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
