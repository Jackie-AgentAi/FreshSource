import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Divider, Drawer, Form, Input, Modal, Progress, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/admin/PageHeader';
import { StatusTag } from '@/components/admin/StatusTag';
import { SHOP_AUDIT_META, SHOP_AUDIT_STATUS, SHOP_STATUS, SHOP_STATUS_META } from '@/constants/status';
import { auditShop, closeShop, getShopDetail, listShops, type ShopItem } from '@/services/admin';

const QUICK_REJECT_REASONS = [
  '营业信息不完整，请补充完善',
  '联系方式无法核验，请重新提交',
  '经营范围与申请类目不一致',
  '店铺资料描述过于简单，需要补充',
  '门店地址信息不完整或疑似异常',
];

const QUICK_APPROVE_HINTS = ['资料完整', '联系方式正常', '经营范围一致', '可进入商品上架阶段'];

type ShopAuditInsights = {
  completeness: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskLabel: string;
  riskColor: string;
  checklist: Array<{ label: string; passed: boolean; hint: string }>;
  riskItems: string[];
  positiveItems: string[];
};

export default function ShopsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ShopItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedShop, setSelectedShop] = useState<ShopItem | null>(null);
  const [auditRemark, setAuditRemark] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ShopItem | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState('');

  const runAudit = async (
    shop: ShopItem,
    auditStatus: typeof SHOP_AUDIT_STATUS.APPROVED | typeof SHOP_AUDIT_STATUS.REJECTED,
    remark: string,
  ) => {
    const resp = await auditShop(shop.id, auditStatus, remark);
    if (resp.code !== 0) {
      message.error(resp.message || (auditStatus === SHOP_AUDIT_STATUS.APPROVED ? '审核失败' : '拒绝失败'));
      return false;
    }
    message.success(auditStatus === SHOP_AUDIT_STATUS.APPROVED ? '已通过' : '已拒绝');
    setDetailOpen(false);
    setAuditRemark('');
    await load();
    return true;
  };

  const getShopAddress = (shop: ShopItem) =>
    `${shop.province || ''}${shop.city || ''}${shop.district || ''}${shop.address || ''}` || '暂无地址';

  const getShopAgeDays = (shop: ShopItem) => {
    if (!shop.created_at) {
      return 0;
    }
    const createdTime = new Date(shop.created_at).getTime();
    if (Number.isNaN(createdTime)) {
      return 0;
    }
    return Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
  };

  const getShopAuditInsights = (shop: ShopItem): ShopAuditInsights => {
    const hasAddress = Boolean(shop.address || shop.province || shop.city || shop.district);
    const descLength = (shop.description || '').trim().length;
    const checklist = [
      { label: '联系电话可核验', passed: Boolean(shop.contact_phone), hint: '需确认电话不为空' },
      { label: '经营地址完整', passed: hasAddress, hint: '需有可识别地址信息' },
      { label: '店铺描述充分', passed: descLength >= 12, hint: '建议至少 12 个字说明经营范围' },
      { label: '店铺名称规范', passed: Boolean((shop.shop_name || '').trim()), hint: '需存在明确店铺名称' },
    ];
    const passCount = checklist.filter((item) => item.passed).length;
    const completeness = Math.round((passCount / checklist.length) * 100);
    const riskItems: string[] = [];
    const positiveItems: string[] = [];

    if (!shop.contact_phone) {
      riskItems.push('缺少联系电话，无法快速核验商家真实性。');
    } else {
      positiveItems.push('已提供联系电话，可安排人工复核。');
    }

    if (!hasAddress) {
      riskItems.push('地址信息不完整，影响线下履约与资质判断。');
    } else {
      positiveItems.push('经营地址完整，可用于后续履约范围核对。');
    }

    if (descLength < 12) {
      riskItems.push('店铺描述偏短，经营范围说明不足。');
    } else {
      positiveItems.push('店铺描述相对完整，便于初步判断经营品类。');
    }

    const waitingDays = getShopAgeDays(shop);
    if (waitingDays >= 7) {
      riskItems.push(`申请已等待 ${waitingDays} 天，存在审核积压风险。`);
    } else if (waitingDays >= 3) {
      riskItems.push(`申请已等待 ${waitingDays} 天，建议优先处理。`);
    } else {
      positiveItems.push('申请时效正常，可按队列处理。');
    }

    if ((shop.rating || 0) > 0) {
      positiveItems.push(`已有历史评分 ${shop.rating}，可作为补充参考。`);
    }

    if ((shop.total_sales || 0) > 0) {
      positiveItems.push(`历史累计销售 ${shop.total_sales}，说明店铺可能已有经营基础。`);
    }

    let riskLevel: ShopAuditInsights['riskLevel'] = 'low';
    let riskLabel = '低风险';
    let riskColor = '#10b981';

    if (riskItems.length >= 3 || completeness < 50) {
      riskLevel = 'high';
      riskLabel = '高风险';
      riskColor = '#ef4444';
    } else if (riskItems.length >= 2 || completeness < 75) {
      riskLevel = 'medium';
      riskLabel = '中风险';
      riskColor = '#f59e0b';
    }

    return { completeness, riskLevel, riskLabel, riskColor, checklist, riskItems, positiveItems };
  };

  const openRejectFlow = (shop: ShopItem, defaultRemark?: string) => {
    setRejectTarget(shop);
    setSelectedRejectReason(defaultRemark || '');
    setAuditRemark(defaultRemark || shop.audit_remark || '');
    setRejectModalOpen(true);
  };

  const openDetail = async (shop: ShopItem) => {
    setSelectedShop(shop);
    setAuditRemark(shop.audit_remark || '');
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const resp = await getShopDetail(shop.id);
      if (resp.code === 0 && resp.data) {
        setSelectedShop(resp.data);
        setAuditRemark(resp.data.audit_remark || '');
      } else if (resp.code !== 0) {
        message.warning(resp.message || '店铺详情加载失败，已展示列表数据');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const load = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    const values = form.getFieldsValue();
    const params: Record<string, string> = { page: String(nextPage), page_size: String(nextPageSize) };
    if (values.audit_status !== undefined && values.audit_status !== null) {
      params.audit_status = String(values.audit_status);
    }
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

  const visibleRows = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return rows;
    }
    return rows.filter((item) =>
      [item.shop_name, item.contact_phone, item.province, item.city, item.district, String(item.id), String(item.user_id)].some(
        (field) => field?.includes(trimmed),
      ),
    );
  }, [keyword, rows]);

  const pendingRows = useMemo(
    () =>
      [...visibleRows]
        .filter((item) => item.audit_status === SHOP_AUDIT_STATUS.PENDING)
        .sort((a, b) => getShopAgeDays(b) - getShopAgeDays(a))
        .slice(0, 3),
    [visibleRows],
  );

  const selectedShopInsights = useMemo(
    () => (selectedShop ? getShopAuditInsights(selectedShop) : null),
    [selectedShop],
  );

  const columns: ColumnsType<ShopItem> = [
    { title: '店铺 ID', dataIndex: 'id', width: 100 },
    { title: '店铺名称', dataIndex: 'shop_name', width: 220 },
    { title: '店主 ID', dataIndex: 'user_id', width: 100 },
    { title: '联系电话', dataIndex: 'contact_phone', width: 150 },
    {
      title: '地址',
      key: 'address',
      width: 240,
      render: (_, row) => `${row.province || ''}${row.city || ''}${row.district || ''}${row.address || ''}`,
    },
    { title: '审核状态', dataIndex: 'audit_status', width: 120, render: (value: number) => <StatusTag meta={SHOP_AUDIT_META[value]} /> },
    { title: '营业状态', dataIndex: 'status', width: 120, render: (value: number) => <StatusTag meta={SHOP_STATUS_META[value]} /> },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => void openDetail(row)}>
            详情
          </Button>
          <Button
            size="small"
            onClick={async () => {
              await runAudit(row, 1, '审核通过');
            }}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            onClick={() => openRejectFlow(row, '审核拒绝')}
          >
            拒绝
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const resp = await closeShop(row.id);
              if (resp.code !== 0) {
                message.error(resp.message || '关店失败');
                return;
              }
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

  const stats = useMemo(
    () => [
      { label: '当前页店铺', value: visibleRows.length },
      { label: '待审核', value: visibleRows.filter((item) => item.audit_status === SHOP_AUDIT_STATUS.PENDING).length },
      { label: '审核通过', value: visibleRows.filter((item) => item.audit_status === SHOP_AUDIT_STATUS.APPROVED).length },
      { label: '营业中', value: visibleRows.filter((item) => item.status === SHOP_STATUS.OPEN).length },
    ],
    [visibleRows],
  );

  return (
    <div className="fm-page">
      <PageHeader
        title="店铺管理"
        description="处理商户入驻审核，并维护店铺营业状态。"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load(page, pageSize)}>
            刷新
          </Button>
        }
      />

      <Card className="fm-panel" bordered={false}>
        <div className="fm-inline-stat">
          {stats.map((item) => (
            <div key={item.label} className="fm-inline-stat__item">
              <div className="fm-inline-stat__label">{item.label}</div>
              <div className="fm-inline-stat__value">{item.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {pendingRows.length > 0 ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <Typography.Text strong>待审核优先队列</Typography.Text>
              <div className="fm-soft-text" style={{ marginTop: 6 }}>
                优先展示当前页中等待时间更长的店铺申请。
              </div>
            </div>
            <Tag color="gold">待处理 {visibleRows.filter((item) => item.audit_status === SHOP_AUDIT_STATUS.PENDING).length}</Tag>
          </div>
          <div className="fm-review-grid">
            {pendingRows.map((shop) => {
              const days = getShopAgeDays(shop);
              const isUrgent = days >= 3;
              const queueInsights = getShopAuditInsights(shop);
              return (
                <div key={shop.id} className="fm-review-card">
                  <div className="fm-review-card__head">
                    <div>
                      <div className="fm-review-card__title">{shop.shop_name}</div>
                      <div className="fm-review-card__meta">
                        <span>店主 #{shop.user_id}</span>
                        <span>{shop.contact_phone || '暂无电话'}</span>
                      </div>
                    </div>
                    <Space size={8} wrap>
                      {queueInsights.riskLevel !== 'low' ? (
                        <Tag color={queueInsights.riskLevel === 'high' ? 'red' : 'gold'}>{queueInsights.riskLabel}</Tag>
                      ) : null}
                      <Tag color={isUrgent ? 'red' : 'gold'}>{isUrgent ? '优先处理' : '待审核'}</Tag>
                    </Space>
                  </div>
                  <div className="fm-review-card__body">
                    <div className="fm-review-card__line">
                      <EnvironmentOutlined />
                      <span>{getShopAddress(shop)}</span>
                    </div>
                    <div className="fm-review-card__line">
                      <ClockCircleOutlined />
                      <span>{days > 0 ? `已等待 ${days} 天` : '今日提交'}</span>
                    </div>
                  </div>
                  <div className="fm-review-card__actions">
                    <Button onClick={() => void openDetail(shop)}>去审核</Button>
                    <Button type="primary" onClick={async () => void (await runAudit(shop, 1, '审核通过'))}>
                      直接通过
                    </Button>
                    <Button danger onClick={() => openRejectFlow(shop)}>
                      驳回
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card className="fm-panel fm-filter-card" bordered={false}>
        <Form form={form} className="fm-filter-form" onFinish={() => void load(1, pageSize)}>
          <Form.Item className="fm-filter-form__wide">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="当前页搜索店铺名、电话、地区、ID"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item name="audit_status">
            <Select
              allowClear
              placeholder="审核状态"
              options={[
                { label: '待审核', value: 0 },
                { label: '审核通过', value: 1 },
                { label: '审核拒绝', value: 2 },
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
                  setKeyword('');
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
          <Typography.Text strong>店铺列表</Typography.Text>
          <Typography.Text type="secondary">总记录数 {total}</Typography.Text>
        </div>
        <Table<ShopItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={visibleRows}
          scroll={{ x: 1200 }}
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
        title="店铺详情"
        width={560}
        open={detailOpen}
        destroyOnClose
        onClose={() => {
          setDetailOpen(false);
          setSelectedShop(null);
          setAuditRemark('');
        }}
        extra={
          selectedShop ? (
            <Space>
              <Button
                onClick={async () => {
                  if (selectedShop) {
                    await runAudit(selectedShop, 1, auditRemark.trim() || '审核通过');
                  }
                }}
              >
                审核通过
              </Button>
              <Button
                danger
                onClick={() => openRejectFlow(selectedShop, auditRemark.trim())}
              >
                驳回
              </Button>
            </Space>
          ) : null
        }
      >
        {selectedShop ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {selectedShop.audit_status === SHOP_AUDIT_STATUS.PENDING ? (
              <Alert
                type={selectedShopInsights?.riskLevel === 'high' ? 'error' : 'warning'}
                showIcon
                message={`该店铺当前处于待审核状态${selectedShopInsights ? `，风险等级：${selectedShopInsights.riskLabel}` : ''}`}
                description={selectedShopInsights?.riskItems[0] || '请核对经营范围、地址与联系方式，再决定是否通过入驻。'}
              />
            ) : null}

            <Card className="fm-panel" bordered={false} loading={detailLoading}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(20,184,166,0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  <ShopOutlined />
                </div>
                <div style={{ flex: 1 }}>
                  <Typography.Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                    {selectedShop.shop_name}
                  </Typography.Title>
                  <Space wrap>
                    <StatusTag meta={SHOP_AUDIT_META[selectedShop.audit_status]} />
                    <StatusTag meta={SHOP_STATUS_META[selectedShop.status]} />
                    {getShopAgeDays(selectedShop) >= 3 ? <Tag color="red">已等待 {getShopAgeDays(selectedShop)} 天</Tag> : null}
                  </Space>
                  <div className="fm-soft-text" style={{ marginTop: 10 }}>
                    {selectedShop.description || '暂无店铺描述'}
                  </div>
                </div>
              </div>

              <div className="fm-inline-stat" style={{ marginBottom: 18 }}>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">累计销售</div>
                  <div className="fm-inline-stat__value">{selectedShop.total_sales || 0}</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">店铺评分</div>
                  <div className="fm-inline-stat__value">{selectedShop.rating || 0}</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">资料等待</div>
                  <div className="fm-inline-stat__value">{getShopAgeDays(selectedShop)} 天</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">资料完整度</div>
                  <div className="fm-inline-stat__value">{selectedShopInsights?.completeness || 0}%</div>
                </div>
              </div>

              <Descriptions column={1} size="small" labelStyle={{ width: 104 }}>
                <Descriptions.Item label="店铺名称">{selectedShop.shop_name}</Descriptions.Item>
                <Descriptions.Item label="店主 ID">{selectedShop.user_id}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{selectedShop.contact_phone || '暂无'}</Descriptions.Item>
                <Descriptions.Item label="审核状态">
                  <StatusTag meta={SHOP_AUDIT_META[selectedShop.audit_status]} />
                </Descriptions.Item>
                <Descriptions.Item label="营业状态">
                  <StatusTag meta={SHOP_STATUS_META[selectedShop.status]} />
                </Descriptions.Item>
                <Descriptions.Item label="评分">{selectedShop.rating || 0}</Descriptions.Item>
                <Descriptions.Item label="累计销售">{selectedShop.total_sales || 0}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedShop.created_at || '暂无'}</Descriptions.Item>
                <Descriptions.Item label="地址">{getShopAddress(selectedShop)}</Descriptions.Item>
                <Descriptions.Item label="店铺描述">{selectedShop.description || '暂无描述'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card className="fm-panel" bordered={false} title="审核判断">
              <div className="fm-audit-overview">
                <div className="fm-audit-overview__card">
                  <div className="fm-audit-overview__label">风险等级</div>
                  <div className="fm-audit-overview__value" style={{ color: selectedShopInsights?.riskColor || '#10b981' }}>
                    {selectedShopInsights?.riskLabel || '低风险'}
                  </div>
                  <div className="fm-soft-text">结合资料完整度、等待时长和基础字段情况综合判断</div>
                </div>
                <div className="fm-audit-overview__card">
                  <div className="fm-audit-overview__label">资料完整度</div>
                  <div style={{ marginTop: 12 }}>
                    <Progress
                      percent={selectedShopInsights?.completeness || 0}
                      strokeColor={selectedShopInsights?.riskColor || '#10b981'}
                      trailColor="#edf5f0"
                    />
                  </div>
                </div>
              </div>

              {selectedShopInsights?.riskItems.length ? (
                <div style={{ marginTop: 18 }}>
                  <Typography.Text strong>风险提示</Typography.Text>
                  <div className="fm-audit-list" style={{ marginTop: 12 }}>
                    {selectedShopInsights.riskItems.map((item) => (
                      <div key={item} className="fm-audit-list__item is-risk">
                        <span className="fm-audit-list__dot" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedShopInsights?.positiveItems.length ? (
                <div style={{ marginTop: 18 }}>
                  <Typography.Text strong>正向信号</Typography.Text>
                  <div className="fm-audit-list" style={{ marginTop: 12 }}>
                    {selectedShopInsights.positiveItems.map((item) => (
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
                {selectedShopInsights?.checklist.map((item) => (
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

            <Card className="fm-panel" bordered={false} title="审核备注">
              <div className="fm-chip-group">
                {QUICK_APPROVE_HINTS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="fm-chip-btn"
                    onClick={() => setAuditRemark((prev) => (prev ? `${prev}\n${hint}` : hint))}
                  >
                    + {hint}
                  </button>
                ))}
              </div>
              <Input.TextArea
                rows={5}
                placeholder="填写审核意见，提交后写入 audit_remark"
                value={auditRemark}
                onChange={(e) => setAuditRemark(e.target.value)}
              />
            </Card>

            <Card className="fm-panel" bordered={false} title="审核建议">
              <div className="fm-chip-group">
                {QUICK_REJECT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className="fm-chip-btn"
                    onClick={() => setAuditRemark(reason)}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Divider style={{ margin: '18px 0' }} />
              <div className="fm-soft-text" style={{ lineHeight: 1.8 }}>
                建议优先核验：联系方式是否可用、地址是否完整、经营范围是否与平台品类匹配。
              </div>
            </Card>

            <Card className="fm-panel" bordered={false} title="运营动作">
              <Space wrap>
                <Button
                  onClick={async () => {
                    if (selectedShop) {
                      await runAudit(selectedShop, 1, auditRemark.trim() || '审核通过');
                    }
                  }}
                >
                  通过入驻
                </Button>
                <Button
                  danger
                  onClick={() => openRejectFlow(selectedShop, auditRemark.trim())}
                >
                  驳回申请
                </Button>
                <Button
                  onClick={async () => {
                    const resp = await closeShop(selectedShop.id);
                    if (resp.code !== 0) {
                      message.error(resp.message || '关店失败');
                      return;
                    }
                    message.success('已关店');
                    setDetailOpen(false);
                    await load();
                  }}
                >
                  强制关店
                </Button>
              </Space>
            </Card>

            <Card className="fm-panel" bordered={false} title="审核轨迹">
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 10, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 999, background: '#10b981', marginTop: 6 }} />
                  </div>
                  <div>
                    <Typography.Text strong>商家提交入驻申请</Typography.Text>
                    <div className="fm-soft-text" style={{ marginTop: 4 }}>
                      {selectedShop.created_at || '暂无时间'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 10, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background:
                          selectedShop.audit_status === SHOP_AUDIT_STATUS.PENDING
                            ? '#f59e0b'
                            : selectedShop.audit_status === SHOP_AUDIT_STATUS.APPROVED
                              ? '#10b981'
                              : '#ef4444',
                        marginTop: 6,
                      }}
                    />
                  </div>
                  <div>
                    <Typography.Text strong>
                      {selectedShop.audit_status === SHOP_AUDIT_STATUS.PENDING
                        ? '待平台审核'
                        : selectedShop.audit_status === SHOP_AUDIT_STATUS.APPROVED
                          ? '平台审核通过'
                          : '平台审核驳回'}
                    </Typography.Text>
                    <div className="fm-soft-text" style={{ marginTop: 4 }}>
                      {selectedShop.audit_remark || '暂无审核备注'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title="驳回入驻申请"
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectTarget(null);
          setSelectedRejectReason('');
        }}
        onOk={async () => {
          if (!rejectTarget) {
            return;
          }
          const finalRemark = auditRemark.trim() || selectedRejectReason.trim();
          if (!finalRemark) {
            message.warning('请先选择或填写驳回原因');
            return;
          }
          const ok = await runAudit(rejectTarget, 2, finalRemark);
          if (ok) {
            setRejectModalOpen(false);
            setRejectTarget(null);
            setSelectedRejectReason('');
          }
        }}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message={rejectTarget ? `将驳回 ${rejectTarget.shop_name} 的入驻申请` : '将驳回当前申请'}
            description="请尽量给出明确原因，方便商家修改后重新提交。"
          />
          <div>
            <Typography.Text strong>常见驳回原因</Typography.Text>
            <div className="fm-chip-group" style={{ marginTop: 12 }}>
              {QUICK_REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={`fm-chip-btn ${selectedRejectReason === reason ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedRejectReason(reason);
                    setAuditRemark(reason);
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
          <Input.TextArea
            rows={5}
            placeholder="填写最终驳回原因"
            value={auditRemark}
            onChange={(e) => setAuditRemark(e.target.value)}
          />
        </Space>
      </Modal>
    </div>
  );
}
