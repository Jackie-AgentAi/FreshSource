import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/admin/PageHeader';
import { StatusTag } from '@/components/admin/StatusTag';
import { ORDER_STATUS, ORDER_STATUS_META, SETTLEMENT_STATUS, SETTLEMENT_STATUS_META } from '@/constants/status';
import { exportOrders, listOrders, updateSettlement, type OrderItem } from '@/services/admin';

type OrderInsights = {
  riskLevel: 'low' | 'medium' | 'high';
  riskLabel: string;
  riskColor: string;
  completeness: number;
  riskItems: string[];
  positiveItems: string[];
  checklist: Array<{ label: string; passed: boolean; hint: string }>;
};

const statusSteps = [
  { key: ORDER_STATUS.PENDING_CONFIRM, title: '待确认' },
  { key: ORDER_STATUS.PENDING_SHIP, title: '待发货' },
  { key: ORDER_STATUS.DELIVERING, title: '配送中' },
  { key: ORDER_STATUS.DELIVERED, title: '已送达' },
  { key: ORDER_STATUS.COMPLETED, title: '已完成' },
];

export default function OrdersPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const resolveStepIndex = (status: number) => {
    const found = statusSteps.findIndex((item) => item.key === status);
    if (found >= 0) {
      return found;
    }
    if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNING, ORDER_STATUS.RETURNED].includes(status)) {
      return 1;
    }
    return 0;
  };

  const getOrderAgeHours = (order: OrderItem) => {
    const created = new Date(order.created_at).getTime();
    if (Number.isNaN(created)) {
      return 0;
    }
    return Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60)));
  };

  const getOrderInsights = (order: OrderItem): OrderInsights => {
    const payAmount = Number(order.pay_amount || 0);
    const totalAmount = Number(order.total_amount || 0);
    const ageHours = getOrderAgeHours(order);
    const settled = order.settlement_status === SETTLEMENT_STATUS.VERIFIED;
    const activeFlow = [
      ORDER_STATUS.PENDING_CONFIRM,
      ORDER_STATUS.PENDING_SHIP,
      ORDER_STATUS.DELIVERING,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.COMPLETED,
    ].includes(order.status);
    const checklist = [
      { label: '订单号完整', passed: Boolean((order.order_no || '').trim()), hint: '需存在可追踪订单号' },
      { label: '店铺信息完整', passed: Boolean(order.shop_name) && order.shop_id > 0, hint: '需能定位店铺主体' },
      { label: '买家信息完整', passed: order.buyer_id > 0, hint: '需能定位买家主体' },
      { label: '支付金额有效', passed: payAmount >= 0, hint: '金额字段需可解析' },
      { label: '状态可流转', passed: typeof order.status === 'number', hint: '订单状态需明确' },
    ];
    const completeness = Math.round((checklist.filter((item) => item.passed).length / checklist.length) * 100);
    const riskItems: string[] = [];
    const positiveItems: string[] = [];

    if (order.status === ORDER_STATUS.CANCELLED) {
      riskItems.push('订单已取消，需要确认取消原因与库存回滚是否已完成。');
    }
    if ([ORDER_STATUS.RETURNING, ORDER_STATUS.RETURNED].includes(order.status)) {
      riskItems.push('订单处于退货链路，建议优先核查售后处理进度。');
    }
    if (!settled && [ORDER_STATUS.COMPLETED, ORDER_STATUS.DELIVERED].includes(order.status)) {
      riskItems.push('订单已送达或完成但尚未核对，存在对账滞后风险。');
    } else if (settled) {
      positiveItems.push('对账状态已完成，可直接纳入结算视图。');
    }
    if (ageHours >= 48 && [ORDER_STATUS.PENDING_CONFIRM, ORDER_STATUS.PENDING_SHIP].includes(order.status)) {
      riskItems.push(`订单已等待 ${ageHours} 小时仍未进入履约后续阶段。`);
    } else if (ageHours < 24 && activeFlow) {
      positiveItems.push('订单时效正常，仍在合理履约窗口内。');
    }
    if (payAmount !== totalAmount) {
      riskItems.push(`订单总额 ¥${totalAmount} 与支付金额 ¥${payAmount} 存在差异，建议核查。`);
    } else {
      positiveItems.push('支付金额与订单金额一致。');
    }
    if (payAmount >= 5000) {
      riskItems.push('高金额订单，建议人工关注履约与结算准确性。');
    } else if (payAmount > 0) {
      positiveItems.push('订单金额处于常规区间。');
    }

    let riskLevel: OrderInsights['riskLevel'] = 'low';
    let riskLabel = '低风险';
    let riskColor = '#10b981';

    if (riskItems.length >= 3 || [ORDER_STATUS.RETURNING, ORDER_STATUS.RETURNED].includes(order.status)) {
      riskLevel = 'high';
      riskLabel = '高风险';
      riskColor = '#ef4444';
    } else if (riskItems.length >= 1) {
      riskLevel = 'medium';
      riskLabel = '中风险';
      riskColor = '#f59e0b';
    }

    return { riskLevel, riskLabel, riskColor, completeness, riskItems, positiveItems, checklist };
  };

  const buildFilterParams = () => {
    const values = form.getFieldsValue();
    const params: Record<string, string> = {};
    ['status', 'shop_id', 'buyer_id', 'settlement_status'].forEach((key) => {
      const value = values[key];
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    });
    ['created_from', 'created_to'].forEach((key) => {
      const value = values[key];
      if (typeof value === 'string' && value.trim() !== '') {
        params[key] = value.trim();
      }
    });
    return params;
  };

  const buildListParams = (nextPage: number, nextPageSize: number) => {
    const params = buildFilterParams();
    params.page = String(nextPage);
    params.page_size = String(nextPageSize);
    return params;
  };

  const load = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    const resp = await listOrders(buildListParams(nextPage, nextPageSize));
    setLoading(false);
    if (resp.code !== 0) {
      message.error(resp.message || '加载订单失败');
      return;
    }
    setRows(resp.data.list || []);
    setTotal(resp.data.pagination?.total || 0);
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  useEffect(() => {
    void load(1, 20);
  }, []);

  const stats = useMemo(
    () => [
      { label: '当前页订单', value: rows.length, icon: <ShoppingCartOutlined /> },
      { label: '待发货', value: rows.filter((item) => item.status === ORDER_STATUS.PENDING_SHIP).length, icon: <ClockCircleOutlined /> },
      { label: '配送中', value: rows.filter((item) => item.status === ORDER_STATUS.DELIVERING).length, icon: <SyncOutlined /> },
      {
        label: '已核对',
        value: rows.filter((item) => item.settlement_status === SETTLEMENT_STATUS.VERIFIED).length,
        icon: <CheckCircleOutlined />,
      },
    ],
    [rows],
  );

  const exceptionCount = useMemo(
    () => rows.filter((item) => [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNING, ORDER_STATUS.RETURNED].includes(item.status)).length,
    [rows],
  );
  const unsettledDeliveredCount = useMemo(
    () =>
      rows.filter(
        (item) =>
          [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(item.status) &&
          item.settlement_status === SETTLEMENT_STATUS.PENDING,
      ).length,
    [rows],
  );
  const priorityQueue = useMemo(
    () =>
      [...rows]
        .map((item) => ({ item, insights: getOrderInsights(item) }))
        .sort((a, b) => {
          const score = (entry: { item: OrderItem; insights: OrderInsights }) =>
            (entry.insights.riskLevel === 'high' ? 100 : entry.insights.riskLevel === 'medium' ? 50 : 10) +
            (entry.item.settlement_status === SETTLEMENT_STATUS.PENDING ? 10 : 0) +
            (getOrderAgeHours(entry.item) >= 48 ? 10 : 0);
          return score(b) - score(a);
        })
        .slice(0, 3),
    [rows],
  );

  const selectedInsights = useMemo(
    () => (selectedOrder ? getOrderInsights(selectedOrder) : null),
    [selectedOrder],
  );

  const columns: ColumnsType<OrderItem> = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      width: 220,
      render: (value: string, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#24332f' }}>{value}</div>
          <div className="fm-soft-text" style={{ marginTop: 6 }}>
            创建于 {row.created_at}
          </div>
        </div>
      ),
    },
    {
      title: '店铺 / 买家',
      key: 'actors',
      width: 200,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.shop_name}</div>
          <div className="fm-soft-text" style={{ marginTop: 6 }}>
            店铺 #{row.shop_id} / 买家 #{row.buyer_id}
          </div>
        </div>
      ),
    },
    {
      title: '订单金额',
      key: 'amount',
      width: 130,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>¥{row.pay_amount}</div>
          <div className="fm-soft-text" style={{ marginTop: 6 }}>
            总额 ¥{row.total_amount}
          </div>
        </div>
      ),
    },
    { title: '订单状态', dataIndex: 'status', width: 120, render: (value: number) => <StatusTag meta={ORDER_STATUS_META[value]} /> },
    {
      title: '对账状态',
      dataIndex: 'settlement_status',
      width: 120,
      render: (value: number) => <StatusTag meta={SETTLEMENT_STATUS_META[value]} />,
    },
    {
      title: '履约风险',
      key: 'risk',
      width: 110,
      render: (_, row) => {
        const insights = getOrderInsights(row);
        return <Tag color={insights.riskLevel === 'high' ? 'red' : insights.riskLevel === 'medium' ? 'gold' : 'green'}>{insights.riskLabel}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, row) => (
        <Space wrap>
          <Button
            size="small"
            onClick={() => {
              setSelectedOrder(row);
              setDetailOpen(true);
            }}
          >
            详情
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const resp = await updateSettlement(
                row.id,
                row.settlement_status === SETTLEMENT_STATUS.VERIFIED
                  ? SETTLEMENT_STATUS.PENDING
                  : SETTLEMENT_STATUS.VERIFIED,
              );
              if (resp.code !== 0) {
                message.error(resp.message || '更新失败');
                return;
              }
              message.success('对账状态已更新');
              await load();
            }}
          >
            {row.settlement_status === SETTLEMENT_STATUS.VERIFIED ? '取消核对' : '标记核对'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="fm-page">
      <PageHeader
        title="订单管理"
        description="查看平台订单状态，识别异常履约，并维护管理端对账标记。"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load(page, pageSize)}>
              刷新
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                window.open(exportOrders(buildFilterParams()), '_blank');
              }}
            >
              导出订单
            </Button>
          </Space>
        }
      />

      <Card className="fm-panel" bordered={false}>
        <div className="fm-inline-stat">
          {stats.map((item) => (
            <div key={item.label} className="fm-inline-stat__item">
              <div className="fm-inline-stat__label">{item.label}</div>
              <div className="fm-inline-stat__value">{item.value}</div>
              <div className="fm-soft-text" style={{ marginTop: 10 }}>
                {item.icon}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(exceptionCount > 0 || unsettledDeliveredCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {exceptionCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`异常订单有 ${exceptionCount} 单`}
              description="已取消、退货中、已退货的订单建议优先人工复核。"
            />
          ) : null}
          {unsettledDeliveredCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`待核对履约订单 ${unsettledDeliveredCount} 单`}
              description="已送达或已完成但仍未核对，建议尽快推进结算确认。"
            />
          ) : null}
        </div>
      )}

      {priorityQueue.length > 0 ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <Typography.Text strong>履约优先队列</Typography.Text>
              <div className="fm-soft-text" style={{ marginTop: 6 }}>
                优先展示异常、未对账或等待较久的订单。
              </div>
            </div>
            <Tag color="gold">待跟进 {priorityQueue.length}</Tag>
          </div>
          <div className="fm-review-grid">
            {priorityQueue.map(({ item, insights }) => (
              <div key={item.id} className="fm-review-card">
                <div className="fm-review-card__head">
                  <div>
                    <div className="fm-review-card__title">{item.order_no}</div>
                    <div className="fm-review-card__meta">
                      <span>{item.shop_name}</span>
                      <span>买家 #{item.buyer_id}</span>
                    </div>
                  </div>
                  <Space size={8} wrap>
                    <Tag color={insights.riskLevel === 'high' ? 'red' : insights.riskLevel === 'medium' ? 'gold' : 'green'}>
                      {insights.riskLabel}
                    </Tag>
                    {item.settlement_status === SETTLEMENT_STATUS.PENDING ? <Tag color="gold">未核对</Tag> : null}
                  </Space>
                </div>
                <div className="fm-review-card__body">
                  <div className="fm-review-card__line">
                    <ShoppingCartOutlined />
                    <span>支付金额 ¥{item.pay_amount}，总额 ¥{item.total_amount}</span>
                  </div>
                  <div className="fm-review-card__line">
                    <ClockCircleOutlined />
                    <span>已等待 {getOrderAgeHours(item)} 小时，状态 {ORDER_STATUS_META[item.status]?.label || '-'}</span>
                  </div>
                </div>
                <div className="fm-review-card__actions">
                  <Button
                    onClick={() => {
                      setSelectedOrder(item);
                      setDetailOpen(true);
                    }}
                  >
                    去处理
                  </Button>
                  <Button
                    type="primary"
                    onClick={async () => {
                      const resp = await updateSettlement(
                        item.id,
                        item.settlement_status === SETTLEMENT_STATUS.VERIFIED
                          ? SETTLEMENT_STATUS.PENDING
                          : SETTLEMENT_STATUS.VERIFIED,
                      );
                      if (resp.code !== 0) {
                        message.error(resp.message || '更新失败');
                        return;
                      }
                      message.success('对账状态已更新');
                      await load();
                    }}
                  >
                    {item.settlement_status === SETTLEMENT_STATUS.VERIFIED ? '取消核对' : '标记核对'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="fm-panel fm-filter-card" bordered={false}>
        <Form form={form} className="fm-filter-form" onFinish={() => void load(1, pageSize)}>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="订单状态"
              options={Object.entries(ORDER_STATUS_META).map(([value, meta]) => ({ value: Number(value), label: meta.label }))}
            />
          </Form.Item>
          <Form.Item name="settlement_status">
            <Select
              allowClear
              placeholder="对账状态"
              options={Object.entries(SETTLEMENT_STATUS_META).map(([value, meta]) => ({ value: Number(value), label: meta.label }))}
            />
          </Form.Item>
          <Form.Item name="shop_id">
            <InputNumber min={1} placeholder="店铺 ID" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="buyer_id">
            <InputNumber min={1} placeholder="买家 ID" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="created_from" className="fm-filter-form__wide">
            <Input placeholder="开始时间，如 2026-04-14T00:00:00+08:00" />
          </Form.Item>
          <Form.Item name="created_to" className="fm-filter-form__wide">
            <Input placeholder="结束时间，如 2026-04-14T23:59:59+08:00" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  void load(1, pageSize);
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="fm-panel fm-table-card" bordered={false}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <Typography.Text strong>订单列表</Typography.Text>
          <Typography.Text type="secondary">总记录数 {total}</Typography.Text>
        </div>
        <Table<OrderItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1380 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => void load(p, ps),
          }}
        />
      </Card>

      <Drawer
        title="订单详情"
        width={620}
        open={detailOpen}
        destroyOnClose
        onClose={() => {
          setDetailOpen(false);
          setSelectedOrder(null);
        }}
      >
        {selectedOrder ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {selectedInsights?.riskItems.length ? (
              <Alert
                type={selectedInsights.riskLevel === 'high' ? 'error' : 'warning'}
                showIcon
                message={`当前订单履约风险：${selectedInsights.riskLabel}`}
                description={selectedInsights.riskItems[0]}
              />
            ) : null}

            <Card className="fm-panel" bordered={false}>
              <Steps
                size="small"
                current={resolveStepIndex(selectedOrder.status)}
                items={statusSteps.map((item) => ({ title: item.title }))}
              />
            </Card>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card className="fm-panel" bordered={false}>
                  <Typography.Text type="secondary">支付金额</Typography.Text>
                  <div className="fm-stat-card__value" style={{ fontSize: 28 }}>
                    ¥{selectedOrder.pay_amount}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card className="fm-panel" bordered={false}>
                  <Typography.Text type="secondary">订单状态</Typography.Text>
                  <div style={{ marginTop: 14 }}>
                    <StatusTag meta={ORDER_STATUS_META[selectedOrder.status]} />
                  </div>
                </Card>
              </Col>
            </Row>

            <Card className="fm-panel" bordered={false}>
              <div className="fm-inline-stat" style={{ marginBottom: 18 }}>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">对账状态</div>
                  <div className="fm-inline-stat__value">
                    {selectedOrder.settlement_status === SETTLEMENT_STATUS.VERIFIED ? '已核对' : '未核对'}
                  </div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">订单金额</div>
                  <div className="fm-inline-stat__value">¥{selectedOrder.total_amount}</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">履约时长</div>
                  <div className="fm-inline-stat__value">{getOrderAgeHours(selectedOrder)}h</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">资料完整度</div>
                  <div className="fm-inline-stat__value">{selectedInsights?.completeness || 0}%</div>
                </div>
              </div>

              <Descriptions column={1} size="small" labelStyle={{ width: 110 }}>
                <Descriptions.Item label="订单 ID">{selectedOrder.id}</Descriptions.Item>
                <Descriptions.Item label="订单号">{selectedOrder.order_no}</Descriptions.Item>
                <Descriptions.Item label="店铺">{selectedOrder.shop_name}</Descriptions.Item>
                <Descriptions.Item label="店铺 ID">{selectedOrder.shop_id}</Descriptions.Item>
                <Descriptions.Item label="买家 ID">{selectedOrder.buyer_id}</Descriptions.Item>
                <Descriptions.Item label="订单金额">¥{selectedOrder.total_amount}</Descriptions.Item>
                <Descriptions.Item label="支付金额">¥{selectedOrder.pay_amount}</Descriptions.Item>
                <Descriptions.Item label="对账状态">
                  <StatusTag meta={SETTLEMENT_STATUS_META[selectedOrder.settlement_status]} />
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedOrder.created_at}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card className="fm-panel" bordered={false} title="履约判断">
              <div className="fm-audit-overview">
                <div className="fm-audit-overview__card">
                  <div className="fm-audit-overview__label">风险等级</div>
                  <div className="fm-audit-overview__value" style={{ color: selectedInsights?.riskColor || '#10b981' }}>
                    {selectedInsights?.riskLabel || '低风险'}
                  </div>
                  <div className="fm-soft-text">结合状态、金额、时效和对账情况做出人工判断</div>
                </div>
                <div className="fm-audit-overview__card">
                  <div className="fm-audit-overview__label">资料完整度</div>
                  <div style={{ marginTop: 12 }}>
                    <Progress
                      percent={selectedInsights?.completeness || 0}
                      strokeColor={selectedInsights?.riskColor || '#10b981'}
                      trailColor="#edf5f0"
                    />
                  </div>
                </div>
              </div>

              {selectedInsights?.riskItems.length ? (
                <div style={{ marginTop: 18 }}>
                  <Typography.Text strong>风险提示</Typography.Text>
                  <div className="fm-audit-list" style={{ marginTop: 12 }}>
                    {selectedInsights.riskItems.map((item) => (
                      <div key={item} className="fm-audit-list__item is-risk">
                        <span className="fm-audit-list__dot" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedInsights?.positiveItems.length ? (
                <div style={{ marginTop: 18 }}>
                  <Typography.Text strong>正向信号</Typography.Text>
                  <div className="fm-audit-list" style={{ marginTop: 12 }}>
                    {selectedInsights.positiveItems.map((item) => (
                      <div key={item} className="fm-audit-list__item is-positive">
                        <span className="fm-audit-list__dot" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="fm-panel" bordered={false} title="履约清单">
              <div className="fm-checklist">
                {selectedInsights?.checklist.map((item) => (
                  <div key={item.label} className="fm-checklist__item">
                    <div>
                      <div className="fm-checklist__title">{item.label}</div>
                      <div className="fm-soft-text">{item.hint}</div>
                    </div>
                    <Tag color={item.passed ? 'green' : 'red'}>{item.passed ? '通过' : '待确认'}</Tag>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="fm-panel" bordered={false} title="运营动作">
              <Space wrap>
                <Button
                  onClick={async () => {
                    const resp = await updateSettlement(
                      selectedOrder.id,
                      selectedOrder.settlement_status === SETTLEMENT_STATUS.VERIFIED
                        ? SETTLEMENT_STATUS.PENDING
                        : SETTLEMENT_STATUS.VERIFIED,
                    );
                    if (resp.code !== 0) {
                      message.error(resp.message || '更新失败');
                      return;
                    }
                    message.success('对账状态已更新');
                    setDetailOpen(false);
                    await load();
                  }}
                >
                  {selectedOrder.settlement_status === SETTLEMENT_STATUS.VERIFIED ? '取消核对' : '标记已核对'}
                </Button>
              </Space>

              <Divider />

              <Typography.Text strong>履约说明</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                当前后端已稳定接入列表、导出与对账标记。订单详情日志与退货流转接口文档存在扩展空间，等接口确认后可继续接入到本面板。
              </Typography.Paragraph>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
