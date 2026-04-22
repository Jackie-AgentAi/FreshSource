import {
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Form, Image, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/admin/PageHeader';
import { StatusTag } from '@/components/admin/StatusTag';
import { BANNER_LINK_TYPE, BANNER_STATUS, USER_STATUS_META } from '@/constants/status';
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

type BannerInsights = {
  scheduleLabel: string;
  scheduleColor: string;
  riskLabel: string;
  riskColor: string;
  riskItems: string[];
};

const BANNER_POSITION_OPTIONS = [
  { label: '首页', value: 'home' },
  { label: '分类页', value: 'category' },
  { label: '活动位', value: 'campaign' },
];

const BANNER_LINK_TYPE_OPTIONS = [
  { label: '不跳转', value: BANNER_LINK_TYPE.NONE },
  { label: '商品详情', value: BANNER_LINK_TYPE.PRODUCT },
  { label: '店铺详情', value: BANNER_LINK_TYPE.SHOP },
  { label: '自定义链接', value: BANNER_LINK_TYPE.URL },
];

function getBannerInsights(item: BannerItem): BannerInsights {
  const now = Date.now();
  const start = item.start_time ? new Date(item.start_time).getTime() : NaN;
  const end = item.end_time ? new Date(item.end_time).getTime() : NaN;
  const hasStart = Number.isFinite(start);
  const hasEnd = Number.isFinite(end);
  const riskItems: string[] = [];

  let scheduleLabel = '长期投放';
  let scheduleColor = 'blue';

  if (hasStart && start > now) {
    scheduleLabel = '待开始';
    scheduleColor = 'gold';
  } else if (hasEnd && end < now) {
    scheduleLabel = '已结束';
    scheduleColor = 'default';
  } else if (hasStart || hasEnd) {
    scheduleLabel = '投放中';
    scheduleColor = 'green';
  }

  if (!item.title) {
    riskItems.push('缺少轮播标题，不利于后台快速识别素材用途。');
  }
  if (!item.image_url) {
    riskItems.push('缺少图片地址，轮播无法正常展示。');
  }
  if (item.link_type !== BANNER_LINK_TYPE.NONE && !item.link_value) {
    riskItems.push('已设置跳转类型但缺少跳转值，点击后将无法落地。');
  }
  if (item.status === BANNER_STATUS.VISIBLE && hasEnd && end < now) {
    riskItems.push('素材已过投放截止时间，建议尽快下线或更新排期。');
  }

  if (riskItems.length >= 2) {
    return { scheduleLabel, scheduleColor, riskLabel: '高风险', riskColor: 'red', riskItems };
  }
  if (riskItems.length === 1) {
    return { scheduleLabel, scheduleColor, riskLabel: '需关注', riskColor: 'gold', riskItems };
  }
  return {
    scheduleLabel,
    scheduleColor,
    riskLabel: item.status === BANNER_STATUS.VISIBLE ? '可投放' : '已隐藏',
    riskColor: item.status === BANNER_STATUS.VISIBLE ? 'green' : 'default',
    riskItems: ['素材信息完整，可继续按计划投放。'],
  };
}

export default function BannersPage() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm<BannerFormValues>();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BannerItem[]>([]);
  const [keyword, setKeyword] = useState('');
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
    if (resp.code !== 0) {
      message.error(resp.message || '加载轮播失败');
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
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) {
      return rows;
    }
    return rows.filter((item) =>
      [item.title, item.position, item.link_value, String(item.id)].some((field) => field?.toLowerCase().includes(trimmed)),
    );
  }, [keyword, rows]);

  const stats = useMemo(
    () => [
      { label: '当前页轮播', value: visibleRows.length, icon: <PictureOutlined /> },
      {
        label: '显示中',
        value: visibleRows.filter((item) => item.status === BANNER_STATUS.VISIBLE).length,
        icon: <ThunderboltOutlined />,
      },
      {
        label: '待开始',
        value: visibleRows.filter((item) => getBannerInsights(item).scheduleLabel === '待开始').length,
        icon: <SettingOutlined />,
      },
      {
        label: '需处理',
        value: visibleRows.filter((item) => getBannerInsights(item).riskColor !== 'green').length,
        icon: <WarningOutlined />,
      },
    ],
    [visibleRows],
  );

  const riskCount = useMemo(() => visibleRows.filter((item) => getBannerInsights(item).riskColor === 'red').length, [visibleRows]);
  const expiredCount = useMemo(() => visibleRows.filter((item) => getBannerInsights(item).scheduleLabel === '已结束').length, [visibleRows]);
  const attentionQueue = useMemo(
    () =>
      [...visibleRows]
        .map((item) => ({ item, insights: getBannerInsights(item) }))
        .sort((a, b) => {
          const score = (entry: { item: BannerItem; insights: BannerInsights }) =>
            (entry.insights.riskColor === 'red' ? 100 : entry.insights.riskColor === 'gold' ? 50 : 10) +
            (entry.insights.scheduleLabel === '已结束' ? 20 : 0) +
            (!entry.item.link_value && entry.item.link_type !== BANNER_LINK_TYPE.NONE ? 10 : 0);
          return score(b) - score(a);
        })
        .slice(0, 3),
    [visibleRows],
  );

  const columns: ColumnsType<BannerItem> = [
    {
      title: '素材',
      key: 'banner',
      width: 260,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Image
            src={row.image_url}
            alt={row.title || 'banner'}
            width={84}
            height={52}
            style={{ objectFit: 'cover', borderRadius: 12, background: '#f3f7f4' }}
            fallback="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
            preview={false}
          />
          <div>
            <div style={{ fontWeight: 600, color: '#24332f' }}>{row.title || '未命名轮播'}</div>
            <div className="fm-soft-text" style={{ marginTop: 6 }}>
              #{row.id} / {BANNER_POSITION_OPTIONS.find((item) => item.value === row.position)?.label || row.position}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '投放状态',
      key: 'schedule',
      width: 150,
      render: (_, row) => {
        const insights = getBannerInsights(row);
        return <Tag color={insights.scheduleColor}>{insights.scheduleLabel}</Tag>;
      },
    },
    {
      title: '跳转配置',
      key: 'link',
      width: 220,
      render: (_, row) => (
        <div>
          <div>{BANNER_LINK_TYPE_OPTIONS.find((item) => item.value === row.link_type)?.label || `类型 ${row.link_type}`}</div>
          <div className="fm-soft-text" style={{ marginTop: 6 }}>
            {row.link_value || '无需跳转'}
          </div>
        </div>
      ),
    },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: number) => <StatusTag meta={USER_STATUS_META[value]} /> },
    { title: '排序', dataIndex: 'sort_order', width: 90 },
    {
      title: '风险',
      key: 'risk',
      width: 110,
      render: (_, row) => {
        const insights = getBannerInsights(row);
        return <Tag color={insights.riskColor}>{insights.riskLabel}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, row) => (
        <Space wrap>
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
            onClick={() => {
              Modal.confirm({
                title: `确认删除轮播「${row.title || `#${row.id}`}」？`,
                content: '删除后该素材将从后台配置中移除，请确认不会影响当前投放位。',
                okText: '确认删除',
                cancelText: '取消',
                okButtonProps: { danger: true },
                onOk: async () => {
                  const resp = await deleteBanner(row.id);
                  if (resp.code !== 0) {
                    message.error(resp.message || '删除失败');
                    return;
                  }
                  message.success('已删除');
                  await load();
                },
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="fm-page">
      <PageHeader
        title="轮播图管理"
        description="管理首页与分类页轮播位的素材、排期和跳转落地。"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load(page, pageSize)}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                editForm.resetFields();
                editForm.setFieldsValue({
                  status: BANNER_STATUS.VISIBLE,
                  link_type: BANNER_LINK_TYPE.NONE,
                  sort_order: 0,
                  position: 'home',
                  title: '',
                  image_url: '',
                  link_value: '',
                  start_time: '',
                  end_time: '',
                });
                setOpen(true);
              }}
            >
              新建轮播
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

      {(riskCount > 0 || expiredCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {riskCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`当前页有 ${riskCount} 个高风险素材`}
              description="这类素材通常缺少跳转值、图片地址或排期不合理，建议优先修复。"
            />
          ) : null}
          {expiredCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`当前页有 ${expiredCount} 个已过期素材`}
              description="已结束排期的轮播建议下线或重新安排投放时间，避免运营位堆积历史素材。"
            />
          ) : null}
        </div>
      )}

      {attentionQueue.length > 0 ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <Typography.Text strong>优先处理素材</Typography.Text>
              <div className="fm-soft-text" style={{ marginTop: 6 }}>
                优先展示排期异常、缺少跳转信息或素材不完整的轮播。
              </div>
            </div>
            <Tag color="gold">候选 {attentionQueue.length}</Tag>
          </div>
          <div className="fm-review-grid">
            {attentionQueue.map(({ item, insights }) => (
              <div key={item.id} className="fm-review-card">
                <div className="fm-review-card__head">
                  <div>
                    <div className="fm-review-card__title">{item.title || '未命名轮播'}</div>
                    <div className="fm-review-card__meta">
                      <span>#{item.id}</span>
                      <span>{BANNER_POSITION_OPTIONS.find((option) => option.value === item.position)?.label || item.position}</span>
                    </div>
                  </div>
                  <Tag color={insights.riskColor}>{insights.riskLabel}</Tag>
                </div>
                <div className="fm-review-card__body">
                  <div className="fm-review-card__line">
                    <ThunderboltOutlined />
                    <span>{insights.scheduleLabel}</span>
                  </div>
                  {insights.riskItems.slice(0, 2).map((risk) => (
                    <div key={risk} className="fm-review-card__line">
                      <WarningOutlined />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
                <div className="fm-review-card__actions">
                  <Button
                    onClick={() => {
                      setEditing(item);
                      editForm.setFieldsValue({
                        ...item,
                        start_time: item.start_time || '',
                        end_time: item.end_time || '',
                      });
                      setOpen(true);
                    }}
                  >
                    去完善
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="fm-panel fm-filter-card" bordered={false}>
        <Form form={form} className="fm-filter-form" onFinish={() => void load(1, pageSize)}>
          <Form.Item className="fm-filter-form__wide">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="当前页内搜索标题、位置、跳转值或 ID"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item name="position">
            <Select allowClear placeholder="全部位置" options={BANNER_POSITION_OPTIONS} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="全部状态"
              options={[
                { label: '隐藏', value: BANNER_STATUS.HIDDEN },
                { label: '显示', value: BANNER_STATUS.VISIBLE },
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
          <Typography.Text strong>轮播配置</Typography.Text>
          <Typography.Text type="secondary">总记录数 {total}</Typography.Text>
        </div>
        <Table<BannerItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={visibleRows}
          scroll={{ x: 1180 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => void load(p, ps),
          }}
        />
      </Card>

      <Modal
        open={open}
        title={editing ? `编辑轮播 · ${editing.title || `#${editing.id}`}` : '新建轮播'}
        destroyOnClose
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await editForm.validateFields();
          const start = values.start_time ? Date.parse(values.start_time) : NaN;
          const end = values.end_time ? Date.parse(values.end_time) : NaN;
          if (Number.isFinite(start) && Number.isFinite(end) && start >= end) {
            message.error('结束时间必须晚于开始时间');
            return;
          }
          const payload = {
            title: (values.title || '').trim(),
            image_url: (values.image_url || '').trim(),
            link_type: values.link_type ?? BANNER_LINK_TYPE.NONE,
            link_value: (values.link_value || '').trim(),
            position: values.position || 'home',
            sort_order: values.sort_order ?? 0,
            status: values.status ?? BANNER_STATUS.VISIBLE,
            start_time: values.start_time || '',
            end_time: values.end_time || '',
          };
          const resp = editing ? await updateBanner(editing.id, payload) : await createBanner(payload);
          if (resp.code !== 0) {
            message.error(resp.message || '保存失败');
            return;
          }
          message.success(editing ? '轮播已更新' : '轮播已创建');
          setOpen(false);
          await load();
        }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="轮播标题" rules={[{ max: 40, message: '标题不超过 40 个字符' }]}>
            <Input maxLength={40} placeholder="例如：首页夏季活动主 Banner" />
          </Form.Item>
          <Form.Item
            name="image_url"
            label="图片 URL"
            rules={[
              { required: true, message: '请输入图片 URL' },
              { type: 'url', warningOnly: true, message: '建议填写标准 URL 以便预览' },
            ]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="link_type" label="跳转类型">
            <Select options={BANNER_LINK_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) => prev.link_type !== current.link_type}
          >
            {({ getFieldValue }) => (
              <Form.Item
                name="link_value"
                label="跳转值"
                rules={
                  getFieldValue('link_type') !== BANNER_LINK_TYPE.NONE
                    ? [{ required: true, message: '请输入跳转值' }]
                    : []
                }
              >
                <Input
                  placeholder={
                    getFieldValue('link_type') === BANNER_LINK_TYPE.URL ? 'https://...' : '请输入商品 ID / 店铺 ID / 链接'
                  }
                />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="position" label="展示位置">
            <Select options={BANNER_POSITION_OPTIONS} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <Select
              options={[
                { label: '0 - 默认', value: 0 },
                { label: '10 - 较高', value: 10 },
                { label: '20 - 高优先级', value: 20 },
                { label: '50 - 顶部资源', value: 50 },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { label: '显示', value: BANNER_STATUS.VISIBLE },
                { label: '隐藏', value: BANNER_STATUS.HIDDEN },
              ]}
            />
          </Form.Item>
          <Form.Item name="start_time" label="开始时间（RFC3339）">
            <Input placeholder="2026-04-22T00:00:00+08:00" />
          </Form.Item>
          <Form.Item name="end_time" label="结束时间（RFC3339）">
            <Input placeholder="2026-04-30T23:59:59+08:00" />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="排期与跳转校验"
            description="如果配置了开始和结束时间，系统会按时间判断待开始、投放中或已结束；非“不跳转”类型必须填写跳转值。"
          />
        </Form>
      </Modal>
    </div>
  );
}
