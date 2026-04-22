import {
  AlertOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Col, Empty, Progress, Row, Space, Spin, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MetricCard } from '@/components/admin/MetricCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { ORDER_STATUS, SHOP_AUDIT_STATUS } from '@/constants/status';
import type { PaginatedData } from '@/types/http';
import { getAdminPhone } from '@/utils/token';
import { apiRequest, withQuery } from '@/utils/http';

const ORDER_STATUS_METRICS: Array<{ key: string; title: string; status?: number }> = [
  { key: 'total', title: '订单总数' },
  { key: 'pending', title: '待确认', status: ORDER_STATUS.PENDING_CONFIRM },
  { key: 'confirmed', title: '待发货', status: ORDER_STATUS.PENDING_SHIP },
  { key: 'delivering', title: '配送中', status: ORDER_STATUS.DELIVERING },
  { key: 'arrived', title: '已送达', status: ORDER_STATUS.DELIVERED },
  { key: 'completed', title: '已完成', status: ORDER_STATUS.COMPLETED },
  { key: 'cancelled', title: '已取消', status: ORDER_STATUS.CANCELLED },
  { key: 'returning', title: '退货中', status: ORDER_STATUS.RETURNING },
  { key: 'returned', title: '已退货', status: ORDER_STATUS.RETURNED },
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
        return apiRequest<PaginatedData<{ id: number }>>(
          withQuery('/api/v1/admin/orders', {
            page: 1,
            page_size: 1,
            status: metric.status,
          }),
          { method: 'GET' },
        );
      });
      const shopRequest = apiRequest<PaginatedData<{ id: number }>>(
        withQuery('/api/v1/admin/shops', {
          page: 1,
          page_size: 1,
          audit_status: SHOP_AUDIT_STATUS.PENDING,
        }),
        { method: 'GET' },
      );

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
    void loadDashboard();
  }, [loadDashboard]);

  const categoryBreakdown = useMemo(
    () => [
      { label: '待确认订单', value: metrics.pending || 0, color: '#f59e0b' },
      { label: '待发货订单', value: metrics.confirmed || 0, color: '#3b82f6' },
      { label: '配送中订单', value: metrics.delivering || 0, color: '#10b981' },
      { label: '退货中订单', value: metrics.returning || 0, color: '#8b5cf6' },
    ],
    [metrics],
  );

  const merchantRanking = useMemo(
    () => [
      { name: '待审核店铺', value: pendingShopCount, to: '/shops' },
      { name: '已完成订单', value: metrics.completed || 0, to: '/orders' },
      { name: '待发货订单', value: metrics.confirmed || 0, to: '/orders' },
      { name: '已取消订单', value: metrics.cancelled || 0, to: '/orders' },
    ],
    [metrics, pendingShopCount],
  );

  const totalOrders = metrics.total || 0;

  return (
    <div className="fm-page">
      <PageHeader
        title="工作台"
        description={`当前管理员：${adminPhone || '未登录'}，这里汇总平台审核、履约与对账的关键指标。`}
        extra={
          <Button type="primary" onClick={() => void loadDashboard()} loading={loading}>
            刷新数据
          </Button>
        }
      />

      {loading ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        </Card>
      ) : error ? (
        <Card className="fm-panel" bordered={false}>
          <Empty description={error} />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} xl={6}>
              <MetricCard
                label="订单总数"
                value={totalOrders}
                accent="#10b981"
                iconBg="rgba(16,185,129,0.14)"
                icon={<ShoppingCartOutlined />}
                footer={`已完成 ${metrics.completed || 0} 单`}
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <MetricCard
                label="待审核店铺"
                value={pendingShopCount}
                accent="#3b82f6"
                iconBg="rgba(59,130,246,0.12)"
                icon={<ShopOutlined />}
                footer="优先处理入驻审核"
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <MetricCard
                label="待发货订单"
                value={metrics.confirmed || 0}
                accent="#f59e0b"
                iconBg="rgba(245,158,11,0.14)"
                icon={<RiseOutlined />}
                footer={`配送中 ${metrics.delivering || 0} 单`}
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <MetricCard
                label="异常事项"
                value={(metrics.cancelled || 0) + (metrics.returning || 0)}
                accent="#ef4444"
                iconBg="rgba(239,68,68,0.12)"
                icon={<AlertOutlined />}
                footer="取消单与退货单合计"
              />
            </Col>
          </Row>

          <Card className="fm-panel" bordered={false}>
            <div className="fm-inline-stat">
              {ORDER_STATUS_METRICS.filter((item) => item.key !== 'total').map((item) => (
                <div key={item.key} className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">{item.title}</div>
                  <div className="fm-inline-stat__value">{metrics[item.key] || 0}</div>
                </div>
              ))}
            </div>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <Card className="fm-panel" title="任务分布" bordered={false}>
                <Space direction="vertical" size={22} style={{ width: '100%' }}>
                  {categoryBreakdown.map((item) => {
                    const percent = totalOrders > 0 ? Math.round((item.value / totalOrders) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Typography.Text>{item.label}</Typography.Text>
                          <Typography.Text strong>{item.value} 单</Typography.Text>
                        </Space>
                        <Progress percent={percent} strokeColor={item.color} trailColor="#edf5f0" showInfo={false} />
                      </div>
                    );
                  })}
                </Space>
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card className="fm-panel" title="待处理入口" bordered={false}>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  {merchantRanking.map((item, index) => (
                    <Button
                      key={item.name}
                      type="text"
                      style={{
                        height: 'auto',
                        padding: 16,
                        border: '1px solid #e6f0ea',
                        borderRadius: 18,
                        justifyContent: 'space-between',
                        background: index === 0 ? '#f5fdf8' : '#fff',
                      }}
                      onClick={() => history.push(item.to)}
                    >
                      <span>{item.name}</span>
                      <Typography.Text strong>{item.value}</Typography.Text>
                    </Button>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={12}>
              <Card className="fm-panel" title="系统公告" bordered={false}>
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  {[
                    { title: '平台升级维护通知', time: '2026-04-20 09:00', type: '系统' },
                    { title: '新增商品审核规范说明', time: '2026-04-19 14:30', type: '业务' },
                    { title: '五一假期配送安排通知', time: '2026-04-18 10:00', type: '通知' },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        padding: 16,
                        border: '1px solid #e6f0ea',
                        borderRadius: 18,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <div>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <div className="fm-soft-text" style={{ marginTop: 6 }}>
                          {item.type}
                        </div>
                      </div>
                      <Typography.Text type="secondary">{item.time}</Typography.Text>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card className="fm-panel" title="执行建议" bordered={false}>
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  {[
                    { title: '优先处理入驻审核', description: `当前仍有 ${pendingShopCount} 家店铺待审核。`, icon: <ShopOutlined /> },
                    {
                      title: '跟进待发货订单',
                      description: `目前共有 ${metrics.confirmed || 0} 单待发货订单。`,
                      icon: <RiseOutlined />,
                    },
                    {
                      title: '关注取消与退货',
                      description: `异常订单合计 ${(metrics.cancelled || 0) + (metrics.returning || 0)} 单。`,
                      icon: <CheckCircleOutlined />,
                    },
                    {
                      title: '核对履约进度',
                      description: `配送中 ${metrics.delivering || 0} 单，已送达 ${metrics.arrived || 0} 单。`,
                      icon: <UserOutlined />,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: 16,
                        borderRadius: 18,
                        background: '#f7fbf8',
                        border: '1px solid #e6f0ea',
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(16,185,129,0.12)',
                          color: '#10b981',
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <div className="fm-soft-text" style={{ marginTop: 6 }}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
