import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Card, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { logout } from '@/services/auth';
import { apiRequest } from '@/utils/http';
import { clearTokens, getAccessToken, getAdminPhone, getRefreshToken } from '@/utils/token';

export default function HomePage() {
  const [adminPing, setAdminPing] = useState<string>('checking');
  const adminPhone = getAdminPhone();

  useEffect(() => {
    if (!getAccessToken()) {
      history.push('/login');
      return;
    }

    apiRequest<{ scope: string }>('/api/v1/admin/ping', { method: 'GET' })
      .then((resp) => {
        if (resp.code === 0) {
          setAdminPing('ok');
        } else {
          setAdminPing('failed');
        }
      })
      .catch(() => setAdminPing('failed'));
  }, []);

  return (
    <PageContainer title="工作台" subTitle="P0-3-1 登录链路验证页">
      <Card>
        <Space direction="vertical" size="middle">
          <Typography.Text>当前管理员：{adminPhone || '未登录'}</Typography.Text>
          <Typography.Text>Admin 路由验证：{adminPing}</Typography.Text>
          <Button
            type="primary"
            danger
            onClick={async () => {
              const refreshToken = getRefreshToken();
              if (refreshToken) {
                await logout(refreshToken);
              }
              clearTokens();
              message.success('已退出登录');
              history.push('/login');
            }}
          >
            退出登录
          </Button>
        </Space>
      </Card>
    </PageContainer>
  );
}
