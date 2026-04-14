import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import { exportOrders, listOrders, updateSettlement, type OrderItem } from '@/services/admin';

export default function OrdersPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const buildFilterParams = () => {
    const values = form.getFieldsValue();
    const params: Record<string, string> = {};
    ['status', 'shop_id', 'buyer_id', 'settlement_status'].forEach((key) => {
      const v = values[key];
      if (v !== undefined && v !== null) params[key] = String(v);
    });
    ['created_from', 'created_to'].forEach((key) => {
      const v = values[key];
      if (typeof v === 'string' && v.trim() !== '') params[key] = v.trim();
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

  const columns: ColumnsType<OrderItem> = [
    { title: '订单ID', dataIndex: 'id', width: 110 },
    { title: '订单号', dataIndex: 'order_no' },
    { title: '店铺ID', dataIndex: 'shop_id', width: 90 },
    { title: '店铺名', dataIndex: 'shop_name' },
    { title: '买家ID', dataIndex: 'buyer_id', width: 90 },
    { title: '状态', dataIndex: 'status', width: 80 },
    {
      title: '对账',
      dataIndex: 'settlement_status',
      width: 100,
      render: (v: number) => (v === 1 ? <Tag color="green">已核对</Tag> : <Tag>未核对</Tag>),
    },
    { title: '金额', dataIndex: 'pay_amount', width: 100 },
    { title: '创建时间', dataIndex: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Button
          size="small"
          onClick={async () => {
            const resp = await updateSettlement(row.id, row.settlement_status === 1 ? 0 : 1);
            if (resp.code !== 0) return message.error(resp.message || '更新失败');
            message.success('对账状态已更新');
            void load();
          }}
        >
          {row.settlement_status === 1 ? '取消核对' : '标记核对'}
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="订单管理"
      extra={[
        <Button
          key="export"
          onClick={() => {
            window.open(exportOrders(buildFilterParams()), '_blank');
          }}
        >
          导出 CSV
        </Button>,
      ]}
    >
      <Card>
        <Form form={form} layout="inline" onFinish={() => void load(1, pageSize)}>
          <Form.Item name="status" label="状态">
            <InputNumber />
          </Form.Item>
          <Form.Item name="shop_id" label="店铺ID">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="buyer_id" label="买家ID">
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item name="settlement_status" label="对账">
            <InputNumber min={0} max={1} />
          </Form.Item>
          <Form.Item name="created_from" label="开始时间">
            <Input placeholder="RFC3339，如 2026-04-14T00:00:00+08:00" style={{ width: 280 }} />
          </Form.Item>
          <Form.Item name="created_to" label="结束时间">
            <Input placeholder="RFC3339，如 2026-04-14T23:59:59+08:00" style={{ width: 280 }} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={() => { form.resetFields(); void load(1, pageSize); }}>重置</Button>
          </Space>
        </Form>
        <Table<OrderItem>
          rowKey="id"
          style={{ marginTop: 16 }}
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => void load(p, ps) }}
        />
      </Card>
    </PageContainer>
  );
}
