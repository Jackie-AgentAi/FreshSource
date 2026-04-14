import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import { createBanner, deleteBanner, listBanners, updateBanner, type BannerItem } from '@/services/admin';

type BannerFormValues = {
  title: string;
  image_url: string;
  link_type: number;
  link_value: string;
  position: string;
  sort_order: number;
  status: number;
  start_time?: string;
  end_time?: string;
};

export default function BannersPage() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm<BannerFormValues>();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BannerItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BannerItem | null>(null);

  const load = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    const values = form.getFieldsValue();
    const params: Record<string, string> = { page: String(nextPage), page_size: String(nextPageSize) };
    if (values.position) params.position = String(values.position);
    if (values.status !== undefined && values.status !== null) params.status = String(values.status);
    const resp = await listBanners(params);
    setLoading(false);
    if (resp.code !== 0) return message.error(resp.message || '加载轮播失败');
    setRows(resp.data.list || []);
    setTotal(resp.data.pagination?.total || 0);
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  useEffect(() => {
    void load(1, 20);
  }, []);

  const columns: ColumnsType<BannerItem> = [
    { title: 'ID', dataIndex: 'id', width: 90 },
    { title: '标题', dataIndex: 'title' },
    { title: '图片', dataIndex: 'image_url' },
    { title: '位置', dataIndex: 'position', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: number) => (v === 1 ? <Tag color="green">显示</Tag> : <Tag>隐藏</Tag>),
    },
    { title: '排序', dataIndex: 'sort_order', width: 90 },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(row);
              editForm.setFieldsValue({
                ...row,
                start_time: row.start_time || '',
                end_time: row.end_time || '',
              });
              setOpen(true);
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            danger
            onClick={async () => {
              const resp = await deleteBanner(row.id);
              if (resp.code !== 0) return message.error(resp.message || '删除失败');
              message.success('已删除');
              void load();
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="轮播管理"
      extra={[
        <Button
          key="create"
          onClick={() => {
            setEditing(null);
            editForm.resetFields();
            editForm.setFieldsValue({ status: 1, link_type: 0, sort_order: 0, position: 'home', title: '', image_url: '', link_value: '' });
            setOpen(true);
          }}
        >
          新建轮播
        </Button>,
      ]}
    >
      <Card>
        <Form form={form} layout="inline" onFinish={() => void load(1, pageSize)}>
          <Form.Item name="position" label="位置">
            <Input placeholder="home/category" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <InputNumber min={0} max={1} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={() => { form.resetFields(); void load(1, pageSize); }}>重置</Button>
          </Space>
        </Form>
        <Table<BannerItem>
          rowKey="id"
          style={{ marginTop: 16 }}
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ current: page, pageSize, total, onChange: (p, ps) => void load(p, ps) }}
        />
      </Card>

      <Modal
        open={open}
        title={editing ? '编辑轮播' : '新建轮播'}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await editForm.validateFields();
          const payload = {
            title: values.title || '',
            image_url: values.image_url,
            link_type: values.link_type ?? 0,
            link_value: values.link_value || '',
            position: values.position || 'home',
            sort_order: values.sort_order ?? 0,
            status: values.status ?? 1,
            start_time: values.start_time || '',
            end_time: values.end_time || '',
          };
          const resp = editing ? await updateBanner(editing.id, payload) : await createBanner(payload);
          if (resp.code !== 0) return message.error(resp.message || '保存失败');
          message.success('保存成功');
          setOpen(false);
          void load();
        }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="标题">
            <Input />
          </Form.Item>
          <Form.Item name="image_url" label="图片 URL" rules={[{ required: true, message: '请输入图片 URL' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="link_type" label="跳转类型">
            <InputNumber min={0} max={3} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="link_value" label="跳转值">
            <Input />
          </Form.Item>
          <Form.Item name="position" label="位置">
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <InputNumber min={0} max={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="start_time" label="开始时间（RFC3339）">
            <Input placeholder="2026-04-14T00:00:00+08:00" />
          </Form.Item>
          <Form.Item name="end_time" label="结束时间（RFC3339）">
            <Input placeholder="2026-04-30T23:59:59+08:00" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
