import { PageContainer, ProCard, StatisticCard } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Col, Empty, Row, Space, Spin, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { logout } from '@/services/auth';
import { apiRequest } from '@/utils/http';
import { clearTokens, getAccessToken, getAdminPhone, getRefreshToken } from '@/utils/token';

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type OrderListData = {
  list: Array<{ id: number }>;
  pagination: Pagination;
};

type ShopListData = {
  list: Array<{ id: number }>;
  pagination: Pagination;
};

type DashboardMetric = {
  key: string;
  title: string;
  value: number;
};

const ORDER_STATUS_METRICS: Array<{ key: string; title: string; status?: number }> = [
  { key: 'total', title: '订单总数' },
  { key: 'pending', title: '待确认', status: 0 },
  { key: 'confirmed', title: '已确认', status: 1 },
  { key: 'delivering', title: '配送中', status: 2 },
  { key: 'arrived', title: '已送达', status: 3 },
  { key: 'completed', title: '已完成', status: 4 },
  { key: 'cancelled', title: '已取消', status: 5 },
  { key: 'returning', title: '退货中', status: 6 },
  { key: 'returned', title: '已退货', status: 7 },
];

export default function HomePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [pendingShopCount, setPendingShopCount] = useState<number>(0);
  const adminPhone = getAdminPhone();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const orderRequests = ORDER_STATUS_METRICS.map((metric) => {
        const query = new URLSearchParams({ page: '1', page_size: '1' });
        if (typeof metric.status === 'number') {
          query.set('status', String(metric.status));
        }
        return apiRequest<OrderListData>(`/api/v1/admin/orders?${query.toString()}`, { method: 'GET' });
      });
      const shopQuery = new URLSearchParams({ page: '1', page_size: '1', audit_status: '0' });
      const shopRequest = apiRequest<ShopListData>(`/api/v1/admin/shops?${shopQuery.toString()}`, { method: 'GET' });

      const orderResults = await Promise.all(orderRequests);
      const shopResult = await shopRequest;

      const invalidOrderResp = orderResults.find((item) => item.code !== 0);
      if (invalidOrderResp) {
        throw new Error(invalidOrderResp.message || '订单统计请求失败');
      }
      if (shopResult.code !== 0) {
        throw new Error(shopResult.message || '店铺统计请求失败');
      }

      const nextMetrics: Record<string, number> = {};
      ORDER_STATUS_METRICS.forEach((item, idx) => {
        nextMetrics[item.key] = orderResults[idx].data?.pagination?.total || 0;
      });
      setMetrics(nextMetrics);
      setPendingShopCount(shopResult.data?.pagination?.total || 0);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : '看板加载失败';
      setError(messageText);
      message.error(messageText);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      history.push('/login');
      return;
    }
    void loadDashboard();
  }, [loadDashboard]);

  const metricCards = useMemo<DashboardMetric[]>(
    () =>
      ORDER_STATUS_METRICS.map((item) => ({
        key: item.key,
        title: item.title,
        value: metrics[item.key] || 0,
      })),
    [metrics],
  );

  return (
    <PageContainer
      title="工作台"
      subTitle="P2-2-1 管理端看板（真实 API）"
      extra={[
        <Button key="refresh" onClick={() => void loadDashboard()} loading={loading}>
          刷新
        </Button>,
      ]}
    >
      <ProCard>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Typography.Text>当前管理员：{adminPhone || '未登录'}</Typography.Text>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <StatisticCard statistic={{ title: '待审核店铺', value: pendingShopCount }} />
            </Col>
          </Row>
          {loading ? (
            <Spin />
          ) : error ? (
            <Empty description={error} />
          ) : (
            <Row gutter={[16, 16]}>
              {metricCards.map((item) => (
                <Col key={item.key} xs={24} sm={12} md={8} lg={6}>
                  <StatisticCard statistic={{ title: item.title, value: item.value }} />
                </Col>
              ))}
            </Row>
          )}
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
          <Typography.Text type="secondary">数据来源：`/api/v1/admin/orders`、`/api/v1/admin/shops`</Typography.Text>
        </Space>
      </ProCard>
    </PageContainer>
  );
}
