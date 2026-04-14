import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { createCategory, deleteCategory, listCategories, updateCategory, type CategoryItem } from '@/services/admin';

type CategoryFormValues = {
  parent_id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: number;
};

function flattenCategories(tree: CategoryItem[]): Array<CategoryItem & { level: number }> {
  const out: Array<CategoryItem & { level: number }> = [];
  const visit = (items: CategoryItem[], level: number) => {
    items.forEach((item) => {
      out.push({ ...item, level });
      if (item.children?.length) visit(item.children, level + 1);
    });
  };
  visit(tree, 1);
  return out;
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Array<CategoryItem & { level: number }>>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(CategoryItem & { level: number }) | null>(null);
  const [form] = Form.useForm<CategoryFormValues>();

  const load = async () => {
    setLoading(true);
    const resp = await listCategories();
    setLoading(false);
    if (resp.code !== 0) {
      message.error(resp.message || '加载分类失败');
      return;
    }
    setRows(flattenCategories(resp.data || []));
  };

  useEffect(() => {
    void load();
  }, []);

  const parentOptions = useMemo(() => rows.map((item) => ({ label: `${item.id} - ${item.name}`, value: item.id })), [rows]);

  const columns: ColumnsType<CategoryItem & { level: number }> = [
    { title: 'ID', dataIndex: 'id', width: 90 },
    { title: '名称', dataIndex: 'name' },
    { title: '层级', dataIndex: 'level', width: 90 },
    { title: '父级ID', dataIndex: 'parent_id', width: 100 },
    { title: '排序', dataIndex: 'sort_order', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: number) => (v === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(row);
              form.setFieldsValue({
                parent_id: row.parent_id,
                name: row.name,
                icon: row.icon || '',
                sort_order: row.sort_order,
                status: row.status,
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
              const resp = await deleteCategory(row.id);
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
    <PageContainer title="分类管理">
      <Card extra={<Button onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ parent_id: 0, status: 1, sort_order: 0, icon: '' }); setOpen(true); }}>新建分类</Button>}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      </Card>

      <Modal
        open={open}
        title={editing ? '编辑分类' : '新建分类'}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          const payload = {
            parent_id: values.parent_id ?? 0,
            name: values.name,
            icon: values.icon || '',
            sort_order: values.sort_order ?? 0,
            status: values.status ?? 1,
          };
          const resp = editing ? await updateCategory(editing.id, payload) : await createCategory(payload);
          if (resp.code !== 0) return message.error(resp.message || '提交失败');
          message.success('保存成功');
          setOpen(false);
          void load();
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ parent_id: 0, sort_order: 0, status: 1, icon: '' }}>
          <Form.Item name="parent_id" label="父级ID">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="name" label="分类名" rules={[{ required: true, message: '请输入分类名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="icon" label="图标">
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <InputNumber min={0} max={1} style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ color: '#999' }}>可用父级：{parentOptions.slice(0, 8).map((o) => o.label).join(' / ') || '暂无'}</div>
        </Form>
      </Modal>
    </PageContainer>
  );
}
