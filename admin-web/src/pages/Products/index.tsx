import {
  AlertOutlined,
  CheckCircleOutlined,
  PictureOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  StarOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Image,
  Form,
  Input,
  InputNumber,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/admin/PageHeader';
import { StatusTag } from '@/components/admin/StatusTag';
import {
  PRODUCT_RECOMMEND_META,
  PRODUCT_RECOMMEND_STATUS,
  PRODUCT_STATUS,
  PRODUCT_STATUS_META,
  SHOP_AUDIT_STATUS,
} from '@/constants/status';
import {
  auditProduct,
  listProducts,
  updateProductRecommend,
  updateProductStatus,
  type ProductItem,
} from '@/services/admin';

type ProductAuditInsights = {
  completeness: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskLabel: string;
  riskColor: string;
  checklist: Array<{ label: string; passed: boolean; hint: string }>;
  riskItems: string[];
  positiveItems: string[];
};

const REVIEW_HINTS = ['图片可识别', '标题清晰', '价格正常', '信息可上架'];

export default function ProductsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [reviewSummary, setReviewSummary] = useState('');

  const getProductInsights = (product: ProductItem): ProductAuditInsights => {
    const hasImage = Boolean((product.cover_image || '').trim());
    const titleLength = (product.name || '').trim().length;
    const subtitleLength = (product.subtitle || '').trim().length;
    const hasCategory = product.category_id > 0;
    const validPrice = Number(product.price) > 0;
    const hasStock = Number(product.stock) > 0;

    const checklist = [
      { label: '主图已上传', passed: hasImage, hint: '建议使用清晰商品主图' },
      { label: '标题信息完整', passed: titleLength >= 4, hint: '建议标题至少 4 个字' },
      { label: '副标题/卖点完整', passed: subtitleLength >= 6, hint: '建议补充卖点描述' },
      { label: '分类已选择', passed: hasCategory, hint: '商品需归属到有效分类' },
      { label: '价格有效', passed: validPrice, hint: '价格需大于 0' },
    ];

    const completeness = Math.round((checklist.filter((item) => item.passed).length / checklist.length) * 100);
    const riskItems: string[] = [];
    const positiveItems: string[] = [];

    if (!hasImage) {
      riskItems.push('缺少商品主图，影响审核与前台展示。');
    } else {
      positiveItems.push('已上传商品主图，可用于列表和详情展示。');
    }

    if (titleLength < 4) {
      riskItems.push('商品标题偏短，信息辨识度不足。');
    } else {
      positiveItems.push('商品标题较清晰，便于买家快速理解。');
    }

    if (subtitleLength < 6) {
      riskItems.push('副标题或卖点信息不足，建议补充核心描述。');
    } else {
      positiveItems.push('副标题包含一定卖点信息，可辅助转化。');
    }

    if (!hasCategory) {
      riskItems.push('未绑定有效分类，可能影响前台归类和搜索。');
    } else {
      positiveItems.push(`已绑定分类 #${product.category_id}。`);
    }

    if (!validPrice) {
      riskItems.push('价格无效，不能直接上架。');
    } else if (Number(product.price) >= 1000) {
      riskItems.push(`价格 ¥${product.price} 偏高，建议复核是否异常。`);
    } else {
      positiveItems.push(`价格 ¥${product.price} 处于可售范围。`);
    }

    if (!hasStock) {
      riskItems.push('库存为 0，审核通过后也会保持下架。');
    } else if (Number(product.stock) <= 10) {
      riskItems.push(`库存仅 ${product.stock}，存在低库存风险。`);
    } else {
      positiveItems.push(`库存 ${product.stock}，可支持正常售卖。`);
    }

    if (product.is_recommend === PRODUCT_RECOMMEND_STATUS.RECOMMENDED) {
      positiveItems.push('当前已进入推荐位，可关注素材与价格竞争力。');
    }

    let riskLevel: ProductAuditInsights['riskLevel'] = 'low';
    let riskLabel = '低风险';
    let riskColor = '#10b981';

    if (riskItems.length >= 4 || completeness < 50) {
      riskLevel = 'high';
      riskLabel = '高风险';
      riskColor = '#ef4444';
    } else if (riskItems.length >= 2 || completeness < 80) {
      riskLevel = 'medium';
      riskLabel = '中风险';
      riskColor = '#f59e0b';
    }

    return { completeness, riskLevel, riskLabel, riskColor, checklist, riskItems, positiveItems };
  };

  const refreshAfterAction = async (executor: () => Promise<boolean>) => {
    const ok = await executor();
    if (ok) {
      await load();
    }
  };

  const approveProduct = async (
    product: ProductItem,
    auditStatus: typeof SHOP_AUDIT_STATUS.APPROVED | typeof SHOP_AUDIT_STATUS.REJECTED,
  ) => {
    const resp = await auditProduct(product.id, auditStatus);
    if (resp.code !== 0) {
      message.error(resp.message || (auditStatus === SHOP_AUDIT_STATUS.APPROVED ? '审核失败' : '驳回失败'));
      return false;
    }
    message.success(auditStatus === SHOP_AUDIT_STATUS.APPROVED ? '审核通过' : '已驳回');
    return true;
  };

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

  const stats = useMemo(
    () => [
      { label: '当前页商品', value: rows.length, icon: <ShoppingOutlined /> },
      { label: '上架中', value: rows.filter((item) => item.status === PRODUCT_STATUS.ONLINE).length, icon: <CheckCircleOutlined /> },
      {
        label: '推荐商品',
        value: rows.filter((item) => item.is_recommend === PRODUCT_RECOMMEND_STATUS.RECOMMENDED).length,
        icon: <StarOutlined />,
      },
      { label: '低库存(<=10)', value: rows.filter((item) => item.stock <= 10).length, icon: <WarningOutlined /> },
    ],
    [rows],
  );

  const missingImageCount = useMemo(() => rows.filter((item) => !(item.cover_image || '').trim()).length, [rows]);
  const zeroStockCount = useMemo(() => rows.filter((item) => item.stock <= 0).length, [rows]);
  const reviewQueue = useMemo(
    () =>
      [...rows]
        .filter((item) => item.status === PRODUCT_STATUS.PENDING_REVIEW)
        .map((item) => ({ item, insights: getProductInsights(item) }))
        .sort((a, b) => {
          const score = (entry: { item: ProductItem; insights: ProductAuditInsights }) =>
            (entry.insights.riskLevel === 'high' ? 100 : entry.insights.riskLevel === 'medium' ? 60 : 20) +
            (entry.item.stock <= 0 ? 30 : entry.item.stock <= 10 ? 10 : 0) +
            (entry.item.status === PRODUCT_STATUS.OFFLINE ? 8 : 0);
          return score(b) - score(a);
        })
        .slice(0, 3),
    [rows],
  );

  const selectedInsights = useMemo(
    () => (selectedProduct ? getProductInsights(selectedProduct) : null),
    [selectedProduct],
  );

  const pendingCount = useMemo(
    () => rows.filter((item) => item.status === PRODUCT_STATUS.PENDING_REVIEW).length,
    [rows],
  );

  const columns: ColumnsType<ProductItem> = [
    {
      title: '商品',
      key: 'product',
      width: 260,
      render: (_, row) => (
        <Space align="start" size={12}>
          {row.cover_image ? (
            <Image
              src={row.cover_image}
              alt={row.name}
              width={56}
              height={56}
              style={{ objectFit: 'cover', borderRadius: 14 }}
              preview={false}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#f3f7f4',
                border: '1px solid #e3eee8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
              }}
            >
              <PictureOutlined />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, color: '#24332f' }}>{row.name}</div>
            <div className="fm-soft-text" style={{ marginTop: 6 }}>
              {row.subtitle || '暂无副标题'}
            </div>
          </div>
        </Space>
      ),
    },
    { title: '商品 ID', dataIndex: 'id', width: 100 },
    { title: '店铺 ID', dataIndex: 'shop_id', width: 100 },
    { title: '分类 ID', dataIndex: 'category_id', width: 100 },
    { title: '价格', dataIndex: 'price', width: 110, render: (value) => `¥${value}` },
    {
      title: '库存/销量',
      key: 'stockSales',
      width: 150,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: row.stock <= 0 ? '#ef4444' : '#24332f' }}>库存 {row.stock}</div>
          <div className="fm-soft-text" style={{ marginTop: 4 }}>
            销量 {row.sales}
          </div>
        </div>
      ),
    },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: number) => <StatusTag meta={PRODUCT_STATUS_META[value]} /> },
    {
      title: '推荐状态',
      dataIndex: 'is_recommend',
      width: 120,
      render: (value: number) => <StatusTag meta={PRODUCT_RECOMMEND_META[value]} />,
    },
    {
      title: '审核风险',
      key: 'risk',
      width: 110,
      render: (_, row) => {
        const insights = getProductInsights(row);
        return <Tag color={insights.riskLevel === 'high' ? 'red' : insights.riskLevel === 'medium' ? 'gold' : 'green'}>{insights.riskLabel}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 360,
      render: (_, row) => (
        <Space wrap>
          <Button
            size="small"
            onClick={() => {
              setSelectedProduct(row);
              setReviewSummary('');
              setDetailOpen(true);
            }}
          >
            详情
          </Button>
          {row.status === PRODUCT_STATUS.PENDING_REVIEW ? (
            <>
              <Button
                size="small"
                onClick={async () => {
                  await refreshAfterAction(() => approveProduct(row, 1));
                }}
              >
                通过
              </Button>
              <Button
                size="small"
                danger
                onClick={async () => {
                  await refreshAfterAction(() => approveProduct(row, 2));
                }}
              >
                驳回
              </Button>
            </>
          ) : null}
          <Button
            size="small"
            onClick={async () => {
              const resp = await updateProductStatus(
                row.id,
                row.status === PRODUCT_STATUS.ONLINE ? PRODUCT_STATUS.OFFLINE : PRODUCT_STATUS.ONLINE,
              );
              if (resp.code !== 0) {
                message.error(resp.message || '状态更新失败');
                return;
              }
              message.success('状态已更新');
              await load();
            }}
          >
            {row.status === PRODUCT_STATUS.ONLINE ? '下架' : '上架'}
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const resp = await updateProductRecommend(row.id, row.is_recommend === 1 ? 0 : 1);
              if (resp.code !== 0) {
                message.error(resp.message || '推荐更新失败');
                return;
              }
              message.success('推荐状态已更新');
              await load();
            }}
          >
            {row.is_recommend === 1 ? '取消推荐' : '设为推荐'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="fm-page">
      <PageHeader
        title="商品管理"
        description="这里只处理商品审核、上下架与推荐位调整；新增商品需由商家在卖家端提交。"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load(page, pageSize)}>
            刷新
          </Button>
        }
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="管理后台不提供新增商品入口"
        description={`按需求与接口约束，新增商品走卖家端 /api/v1/seller/products；商家提交后会以“审核中”状态进入这里，当前页待审核商品 ${pendingCount} 个。`}
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

      {(zeroStockCount > 0 || missingImageCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {zeroStockCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`库存为 0 的商品有 ${zeroStockCount} 个`}
              description="这些商品即使审核通过，也会因为库存规则保持不可售状态。"
            />
          ) : null}
          {missingImageCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`缺少主图的商品有 ${missingImageCount} 个`}
              description="建议优先补图，否则前台展示和审核判断都会受影响。"
            />
          ) : null}
        </div>
      )}

      {reviewQueue.length > 0 ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <Typography.Text strong>优先处理队列</Typography.Text>
              <div className="fm-soft-text" style={{ marginTop: 6 }}>
                优先展示风险更高、信息不完整或库存异常的商品。
              </div>
            </div>
            <Tag color="gold">候选 {reviewQueue.length}</Tag>
          </div>
          <div className="fm-review-grid">
            {reviewQueue.map(({ item, insights }) => (
              <div key={item.id} className="fm-review-card">
                <div className="fm-review-card__head">
                  <div>
                    <div className="fm-review-card__title">{item.name}</div>
                    <div className="fm-review-card__meta">
                      <span>商品 #{item.id}</span>
                      <span>店铺 #{item.shop_id}</span>
                    </div>
                  </div>
                  <Space size={8} wrap>
                    <Tag color={insights.riskLevel === 'high' ? 'red' : insights.riskLevel === 'medium' ? 'gold' : 'green'}>
                      {insights.riskLabel}
                    </Tag>
                    {item.stock <= 0 ? <Tag color="red">库存 0</Tag> : null}
                  </Space>
                </div>
                <div className="fm-review-card__body">
                  <div className="fm-review-card__line">
                    <ShoppingOutlined />
                    <span>价格 ¥{item.price}，库存 {item.stock}，销量 {item.sales}</span>
                  </div>
                  <div className="fm-review-card__line">
                    <PictureOutlined />
                    <span>{item.cover_image ? '主图已上传' : '缺少主图'}，完整度 {insights.completeness}%</span>
                  </div>
                </div>
                <div className="fm-review-card__actions">
                  <Button
                    onClick={() => {
                      setSelectedProduct(item);
                      setReviewSummary('');
                      setDetailOpen(true);
                    }}
                  >
                    去审核
                  </Button>
                  <Button type="primary" onClick={async () => void (await refreshAfterAction(() => approveProduct(item, 1)))}>
                    直接通过
                  </Button>
                  <Button danger onClick={async () => void (await refreshAfterAction(() => approveProduct(item, 2)))}>
                    驳回
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="fm-panel fm-filter-card" bordered={false}>
        <Form form={form} className="fm-filter-form" onFinish={() => void load(1, pageSize)}>
          <Form.Item name="keyword" className="fm-filter-form__wide">
            <Input allowClear placeholder="搜索商品名或副标题" />
          </Form.Item>
          <Form.Item name="shop_id">
            <InputNumber min={1} placeholder="店铺 ID" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="商品状态"
              options={[
                { label: '下架', value: PRODUCT_STATUS.OFFLINE },
                { label: '上架', value: PRODUCT_STATUS.ONLINE },
                { label: '审核中', value: PRODUCT_STATUS.PENDING_REVIEW },
              ]}
            />
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
          <Typography.Text strong>商品列表</Typography.Text>
          <Typography.Text type="secondary">总记录数 {total}</Typography.Text>
        </div>
        <Table<ProductItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1450 }}
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
        title="商品详情"
        width={620}
        open={detailOpen}
        destroyOnClose
        onClose={() => {
          setDetailOpen(false);
          setSelectedProduct(null);
          setReviewSummary('');
        }}
        extra={
          selectedProduct?.status === PRODUCT_STATUS.PENDING_REVIEW ? (
            <Space>
              <Button
                onClick={async () => {
                  await refreshAfterAction(async () => {
                    const ok = await approveProduct(selectedProduct, 1);
                    if (ok) {
                      setDetailOpen(false);
                    }
                    return ok;
                  });
                }}
              >
                审核通过
              </Button>
              <Button
                danger
                onClick={async () => {
                  await refreshAfterAction(async () => {
                    const ok = await approveProduct(selectedProduct, 2);
                    if (ok) {
                      setDetailOpen(false);
                    }
                    return ok;
                  });
                }}
              >
                驳回
              </Button>
            </Space>
          ) : null
        }
      >
        {selectedProduct ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {selectedInsights?.riskItems.length ? (
              <Alert
                type={selectedInsights.riskLevel === 'high' ? 'error' : 'warning'}
                showIcon
                message={`当前商品审核风险：${selectedInsights.riskLabel}`}
                description={selectedInsights.riskItems[0]}
              />
            ) : null}

            <Card className="fm-panel" bordered={false}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {selectedProduct.cover_image ? (
                  <Image
                    src={selectedProduct.cover_image}
                    alt={selectedProduct.name}
                    width={160}
                    height={160}
                    style={{ objectFit: 'cover', borderRadius: 18 }}
                    fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
                  />
                ) : (
                  <div
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: 18,
                      background: '#f3f7f4',
                      border: '1px solid #e3eee8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    暂无图片
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                    {selectedProduct.name}
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 14 }}>
                    {selectedProduct.subtitle || '暂无副标题'}
                  </Typography.Paragraph>
                  <Space wrap>
                    <StatusTag meta={PRODUCT_STATUS_META[selectedProduct.status]} />
                    <StatusTag meta={PRODUCT_RECOMMEND_META[selectedProduct.is_recommend]} />
                    <Tag color={selectedInsights?.riskLevel === 'high' ? 'red' : selectedInsights?.riskLevel === 'medium' ? 'gold' : 'green'}>
                      {selectedInsights?.riskLabel || '低风险'}
                    </Tag>
                  </Space>
                  <div className="fm-soft-text" style={{ marginTop: 12 }}>
                    商品编号 #{selectedProduct.id}，店铺 #{selectedProduct.shop_id}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="fm-panel" bordered={false}>
              <div className="fm-inline-stat" style={{ marginBottom: 18 }}>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">商品价格</div>
                  <div className="fm-inline-stat__value">¥{selectedProduct.price}</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">库存数量</div>
                  <div className="fm-inline-stat__value">{selectedProduct.stock}</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">销量</div>
                  <div className="fm-inline-stat__value">{selectedProduct.sales}</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">资料完整度</div>
                  <div className="fm-inline-stat__value">{selectedInsights?.completeness || 0}%</div>
                </div>
              </div>
              <Descriptions column={1} size="small" labelStyle={{ width: 116 }}>
                <Descriptions.Item label="商品 ID">{selectedProduct.id}</Descriptions.Item>
                <Descriptions.Item label="店铺 ID">{selectedProduct.shop_id}</Descriptions.Item>
                <Descriptions.Item label="分类 ID">{selectedProduct.category_id}</Descriptions.Item>
                <Descriptions.Item label="价格">¥{selectedProduct.price}</Descriptions.Item>
                <Descriptions.Item label="库存">{selectedProduct.stock}</Descriptions.Item>
                <Descriptions.Item label="销量">{selectedProduct.sales}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedProduct.created_at || '暂无'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card className="fm-panel" bordered={false} title="审核判断">
              <div className="fm-audit-overview">
                <div className="fm-audit-overview__card">
                  <div className="fm-audit-overview__label">风险等级</div>
                  <div className="fm-audit-overview__value" style={{ color: selectedInsights?.riskColor || '#10b981' }}>
                    {selectedInsights?.riskLabel || '低风险'}
                  </div>
                  <div className="fm-soft-text">结合图片、标题、分类、价格和库存做出快速判断</div>
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

            <Card className="fm-panel" bordered={false} title="审核清单">
              <div className="fm-checklist">
                {selectedInsights?.checklist.map((item) => (
                  <div key={item.label} className="fm-checklist__item">
                    <div>
                      <div className="fm-checklist__title">{item.label}</div>
                      <div className="fm-soft-text">{item.hint}</div>
                    </div>
                    <Tag color={item.passed ? 'green' : 'red'}>{item.passed ? '通过' : '待补充'}</Tag>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="fm-panel" bordered={false} title="审核结论摘要">
              <div className="fm-chip-group">
                {REVIEW_HINTS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="fm-chip-btn"
                    onClick={() => setReviewSummary((prev) => (prev ? `${prev}\n${hint}` : hint))}
                  >
                    + {hint}
                  </button>
                ))}
              </div>
              <Input.TextArea
                rows={4}
                placeholder="填写本次审核的判断摘要。当前后端不保存该字段，用于人工审核辅助。"
                value={reviewSummary}
                onChange={(e) => setReviewSummary(e.target.value)}
              />
            </Card>

            <Card className="fm-panel" bordered={false} title="运营动作">
              <Space wrap>
                {selectedProduct.status === PRODUCT_STATUS.PENDING_REVIEW ? (
                  <>
                    <Button
                      onClick={async () => {
                        await refreshAfterAction(async () => {
                          const ok = await approveProduct(selectedProduct, 1);
                          if (ok) {
                            setDetailOpen(false);
                          }
                          return ok;
                        });
                      }}
                    >
                      审核通过
                    </Button>
                    <Button
                      danger
                      onClick={async () => {
                        await refreshAfterAction(async () => {
                          const ok = await approveProduct(selectedProduct, 2);
                          if (ok) {
                            setDetailOpen(false);
                          }
                          return ok;
                        });
                      }}
                    >
                      驳回商品
                    </Button>
                  </>
                ) : null}
                <Button
                  onClick={async () => {
                    const resp = await updateProductStatus(
                      selectedProduct.id,
                      selectedProduct.status === PRODUCT_STATUS.ONLINE ? PRODUCT_STATUS.OFFLINE : PRODUCT_STATUS.ONLINE,
                    );
                    if (resp.code !== 0) {
                      message.error(resp.message || '状态更新失败');
                      return;
                    }
                    message.success('状态已更新');
                    setDetailOpen(false);
                    await load();
                  }}
                >
                  {selectedProduct.status === PRODUCT_STATUS.ONLINE ? '执行下架' : '恢复上架'}
                </Button>
                <Button
                  onClick={async () => {
                    const resp = await updateProductRecommend(
                      selectedProduct.id,
                      selectedProduct.is_recommend === 1 ? 0 : 1,
                    );
                    if (resp.code !== 0) {
                      message.error(resp.message || '推荐更新失败');
                      return;
                    }
                    message.success('推荐状态已更新');
                    setDetailOpen(false);
                    await load();
                  }}
                >
                  {selectedProduct.is_recommend === 1 ? '取消推荐' : '加入推荐'}
                </Button>
              </Space>
              <Typography.Paragraph type="secondary" style={{ marginTop: 14, marginBottom: 0 }}>
                当前后端已支持审核通过/驳回、上下架和推荐位动作；审核摘要仅作为当前页面辅助判断，不写回接口。
              </Typography.Paragraph>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
