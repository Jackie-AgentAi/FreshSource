import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, InputNumber, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import { listUsers, updateUserStatus, type UserItem } from '@/services/admin';

export default function UsersPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UserItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const load = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    const values = form.getFieldsValue();
    const params: Record<string, string> = { page: String(nextPage), page_size: String(nextPageSize) };
    if (values.role !== undefined && values.role !== null) params.role = String(values.role);
    if (values.status !== undefined && values.status !== null) params.status = String(values.status);
    const resp = await listUsers(params);
    setLoading(false);
    if (resp.code !== 0) {
      message.error(resp.message || '加载用户失败');
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

  const columns: ColumnsType<UserItem> = [
    { title: 'ID', dataIndex: 'id', width: 90 },
    { title: '手机号', dataIndex: 'phone' },
    { title: '昵称', dataIndex: 'nickname' },
    {
      title: '角色',
      dataIndex: 'role',
      render: (v: number) => (v === 1 ? '买家' : v === 2 ? '卖家' : '管理员'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
    },
    { title: '创建时间', dataIndex: 'created_at' },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Button
          size="small"
          onClick={async () => {
            const next = row.status === 1 ? 0 : 1;
            const resp = await updateUserStatus(row.id, next);
            if (resp.code !== 0) {
              message.error(resp.message || '更新失败');
              return;
            }
            message.success('更新成功');
            void load();
          }}
        >
          {row.status === 1 ? '禁用' : '启用'}
        </Button>
      ),
    },
  ];

  return (
    <PageContainer title="用户管理">
      <Card>
        <Form form={form} layout="inline" onFinish={() => void load(1, pageSize)}>
          <Form.Item name="role" label="角色">
            <InputNumber min={1} max={3} placeholder="1/2/3" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <InputNumber min={0} max={1} placeholder="0/1" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={() => { form.resetFields(); void load(1, pageSize); }}>重置</Button>
          </Space>
        </Form>
        <Table<UserItem>
          rowKey="id"
          style={{ marginTop: 16 }}
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => void load(p, ps),
          }}
        />
      </Card>
    </PageContainer>
  );
}
