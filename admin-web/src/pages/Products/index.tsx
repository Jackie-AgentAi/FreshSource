import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import {
  auditProduct,
  listProducts,
  updateProductRecommend,
  updateProductStatus,
  type ProductItem,
} from '@/services/admin';

export default function ProductsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const load = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    const values = form.getFieldsValue();
    const params: Record<string, string> = { page: String(nextPage), page_size: String(nextPageSize) };
    if (values.status !== undefined && values.status !== null) params.status = String(values.status);
    if (values.shop_id !== undefined && values.shop_id !== null) params.shop_id = String(values.shop_id);
    if (values.keyword) params.keyword = String(values.keyword);
    const resp = await listProducts(params);
    setLoading(false);
    if (resp.code !== 0) {
      message.error(resp.message || '加载商品失败');
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

  const columns: ColumnsType<ProductItem> = [
    { title: 'ID', dataIndex: 'id', width: 90 },
    { title: '名称', dataIndex: 'name' },
    { title: '店铺ID', dataIndex: 'shop_id', width: 100 },
    { title: '价格', dataIndex: 'price', width: 100 },
    { title: '库存', dataIndex: 'stock', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) => (v === 1 ? <Tag color="green">上架</Tag> : <Tag color="red">下架</Tag>),
    },
    {
      title: '推荐',
      dataIndex: 'is_recommend',
      render: (v: number) => (v === 1 ? <Tag color="blue">推荐</Tag> : <Tag>普通</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            onClick={async () => {
              const resp = await auditProduct(row.id, 1);
              if (resp.code !== 0) return message.error(resp.message || '审核失败');
              message.success('审核通过');
              void load();
            }}
          >
            通过
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const resp = await auditProduct(row.id, 2);
              if (resp.code !== 0) return message.error(resp.message || '驳回失败');
              message.success('已驳回');
              void load();
            }}
          >
            驳回
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const resp = await updateProductStatus(row.id, row.status === 1 ? 0 : 1);
              if (resp.code !== 0) return message.error(resp.message || '状态更新失败');
              message.success('状态已更新');
              void load();
            }}
          >
            {row.status === 1 ? '下架' : '上架'}
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const resp = await updateProductRecommend(row.id, row.is_recommend === 1 ? 0 : 1);
              if (resp.code !== 0) return message.error(resp.message || '推荐更新失败');
              message.success('推荐状态已更新');
              void load();
            }}
          >
            {row.is_recommend === 1 ? '取消推荐' : '设为推荐'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="商品管理">
      <Card>
        <Form form={form} layout="inline" onFinish={() => void load(1, pageSize)}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="商品名/副标题" />
          </Form.Item>
          <Form.Item name="shop_id" label="店铺ID">
            <InputNumber min={1} />
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
        <Table<ProductItem>
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
