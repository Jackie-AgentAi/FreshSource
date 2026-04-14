import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, InputNumber, Modal, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import { auditShop, closeShop, listShops, type ShopItem } from '@/services/admin';

export default function ShopsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ShopItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const load = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    const values = form.getFieldsValue();
    const params: Record<string, string> = { page: String(nextPage), page_size: String(nextPageSize) };
    if (values.audit_status !== undefined && values.audit_status !== null) params.audit_status = String(values.audit_status);
    const resp = await listShops(params);
    setLoading(false);
    if (resp.code !== 0) {
      message.error(resp.message || '加载店铺失败');
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

  const columns: ColumnsType<ShopItem> = [
    { title: 'ID', dataIndex: 'id', width: 90 },
    { title: '店铺名', dataIndex: 'shop_name' },
    { title: '店主ID', dataIndex: 'user_id', width: 100 },
    { title: '联系电话', dataIndex: 'contact_phone' },
    {
      title: '审核',
      dataIndex: 'audit_status',
      render: (v: number) => (v === 1 ? <Tag color="green">通过</Tag> : v === 2 ? <Tag color="red">拒绝</Tag> : <Tag>待审</Tag>),
    },
    {
      title: '营业',
      dataIndex: 'status',
      render: (v: number) => (v === 1 ? <Tag color="green">营业中</Tag> : <Tag color="red">已关店</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            onClick={async () => {
              const resp = await auditShop(row.id, 1, '审核通过');
              if (resp.code !== 0) return message.error(resp.message || '审核失败');
              message.success('已通过');
              void load();
            }}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: '确认拒绝该店铺？',
                content: '可填写审核备注',
                async onOk() {
                  const resp = await auditShop(row.id, 2, '审核拒绝');
                  if (resp.code !== 0) return message.error(resp.message || '拒绝失败');
                  message.success('已拒绝');
                  void load();
                },
              });
            }}
          >
            拒绝
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const resp = await closeShop(row.id);
              if (resp.code !== 0) return message.error(resp.message || '关店失败');
              message.success('已关店');
              void load();
            }}
          >
            强制关店
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="店铺管理">
      <Card>
        <Form form={form} layout="inline" onFinish={() => void load(1, pageSize)}>
          <Form.Item name="audit_status" label="审核状态">
            <InputNumber min={0} max={2} placeholder="0/1/2" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                查询
              </Button>
              <Button onClick={() => { form.resetFields(); void load(1, pageSize); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
        <Table<ShopItem>
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
