import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/admin/PageHeader';
import { StatusTag } from '@/components/admin/StatusTag';
import { USER_ROLE, USER_ROLE_META, USER_STATUS, USER_STATUS_META } from '@/constants/status';
import { listUsers, updateUserStatus, type UserItem } from '@/services/admin';

type UserInsights = {
  riskLevel: 'low' | 'medium' | 'high';
  riskLabel: string;
  riskColor: string;
  completeness: number;
  riskItems: string[];
  positiveItems: string[];
  checklist: Array<{ label: string; passed: boolean; hint: string }>;
};

export default function UsersPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const getUserInsights = (user: UserItem): UserInsights => {
    const hasNickname = Boolean((user.nickname || '').trim());
    const hasPhone = Boolean((user.phone || '').trim());
    const hasLogin = Boolean((user.last_login_at || '').trim());
    const checklist = [
      { label: '手机号已登记', passed: hasPhone, hint: '用户需绑定手机号' },
      { label: '昵称已设置', passed: hasNickname, hint: '建议用户补充昵称' },
      {
        label: '角色明确',
        passed: [USER_ROLE.BUYER, USER_ROLE.SELLER, USER_ROLE.ADMIN].includes(user.role),
        hint: '角色需在买家/卖家/管理员范围内',
      },
      { label: '登录记录存在', passed: hasLogin, hint: '便于判断账号活跃度' },
    ];
    const completeness = Math.round((checklist.filter((item) => item.passed).length / checklist.length) * 100);
    const riskItems: string[] = [];
    const positiveItems: string[] = [];

    if (user.status === USER_STATUS.DISABLED) {
      riskItems.push('账号当前已禁用，需确认是否仍需恢复使用。');
    } else {
      positiveItems.push('账号处于启用状态。');
    }

    if (!hasLogin) {
      riskItems.push('缺少最近登录记录，活跃度信息不足。');
    } else {
      positiveItems.push(`存在最近登录记录：${user.last_login_at}。`);
    }

    if (!hasNickname) {
      riskItems.push('用户未设置昵称，资料完整度较低。');
    } else {
      positiveItems.push('昵称资料完整。');
    }

    if (user.role === USER_ROLE.SELLER) {
      positiveItems.push('当前账号为卖家，建议结合店铺与订单运营情况继续观察。');
    }
    if (user.role === USER_ROLE.ADMIN) {
      riskItems.push('管理员账号需谨慎操作，建议避免误禁用。');
    }

    let riskLevel: UserInsights['riskLevel'] = 'low';
    let riskLabel = '低风险';
    let riskColor = '#10b981';

    if (
      (user.status === USER_STATUS.DISABLED && !hasLogin) ||
      (user.role === USER_ROLE.ADMIN && user.status === USER_STATUS.DISABLED)
    ) {
      riskLevel = 'high';
      riskLabel = '高风险';
      riskColor = '#ef4444';
    } else if (riskItems.length >= 2 || completeness < 75) {
      riskLevel = 'medium';
      riskLabel = '中风险';
      riskColor = '#f59e0b';
    }

    return { riskLevel, riskLabel, riskColor, completeness, riskItems, positiveItems, checklist };
  };

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

  const visibleRows = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return rows;
    }
    return rows.filter((item) => [item.phone, item.nickname, String(item.id)].some((field) => field?.includes(trimmed)));
  }, [keyword, rows]);

  const stats = useMemo(
    () => [
      { label: '当前页用户', value: visibleRows.length, icon: <UserOutlined /> },
      { label: '买家', value: visibleRows.filter((item) => item.role === USER_ROLE.BUYER).length, icon: <CheckCircleOutlined /> },
      { label: '卖家', value: visibleRows.filter((item) => item.role === USER_ROLE.SELLER).length, icon: <ClockCircleOutlined /> },
      { label: '已启用', value: visibleRows.filter((item) => item.status === USER_STATUS.ENABLED).length, icon: <CheckCircleOutlined /> },
    ],
    [visibleRows],
  );

  const disabledCount = useMemo(() => visibleRows.filter((item) => item.status === USER_STATUS.DISABLED).length, [visibleRows]);
  const noLoginCount = useMemo(() => visibleRows.filter((item) => !item.last_login_at).length, [visibleRows]);
  const priorityQueue = useMemo(
    () =>
      [...visibleRows]
        .map((item) => ({ item, insights: getUserInsights(item) }))
        .sort((a, b) => {
          const score = (entry: { item: UserItem; insights: UserInsights }) =>
            (entry.insights.riskLevel === 'high' ? 100 : entry.insights.riskLevel === 'medium' ? 50 : 10) +
            (entry.item.status === USER_STATUS.DISABLED ? 20 : 0) +
            (!entry.item.last_login_at ? 10 : 0);
          return score(b) - score(a);
        })
        .slice(0, 3),
    [visibleRows],
  );

  const selectedInsights = useMemo(
    () => (selectedUser ? getUserInsights(selectedUser) : null),
    [selectedUser],
  );

  const columns: ColumnsType<UserItem> = [
    {
      title: '用户',
      key: 'user',
      width: 220,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#24332f' }}>{row.nickname || '未设置昵称'}</div>
          <div className="fm-soft-text" style={{ marginTop: 6 }}>
            #{String(row.id).padStart(6, '0')} / {row.phone || '暂无手机号'}
          </div>
        </div>
      ),
    },
    { title: '角色', dataIndex: 'role', width: 120, render: (value: number) => <StatusTag meta={USER_ROLE_META[value]} /> },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: number) => <StatusTag meta={USER_STATUS_META[value]} /> },
    {
      title: '最近登录',
      dataIndex: 'last_login_at',
      width: 180,
      render: (value) => value || <Tag color="gold">暂无记录</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 180 },
    {
      title: '账号风险',
      key: 'risk',
      width: 110,
      render: (_, row) => {
        const insights = getUserInsights(row);
        return <Tag color={insights.riskLevel === 'high' ? 'red' : insights.riskLevel === 'medium' ? 'gold' : 'green'}>{insights.riskLabel}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, row) => (
        <Space wrap>
          <Button
            size="small"
            onClick={() => {
              setSelectedUser(row);
              setDetailOpen(true);
            }}
          >
            详情
          </Button>
          <Button
            size="small"
            onClick={async () => {
              const next = row.status === USER_STATUS.ENABLED ? USER_STATUS.DISABLED : USER_STATUS.ENABLED;
              const resp = await updateUserStatus(row.id, next);
              if (resp.code !== 0) {
                message.error(resp.message || '更新失败');
                return;
              }
              message.success('更新成功');
              await load();
            }}
          >
            {row.status === USER_STATUS.ENABLED ? '禁用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="fm-page">
      <PageHeader
        title="用户管理"
        description="统一查看平台买家、卖家和管理员账号状态。"
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
              <div className="fm-soft-text" style={{ marginTop: 10 }}>
                {item.icon}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(disabledCount > 0 || noLoginCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {disabledCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`当前页禁用账号 ${disabledCount} 个`}
              description="建议复核禁用原因，确认是否仍需限制使用。"
            />
          ) : null}
          {noLoginCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`缺少登录记录的账号 ${noLoginCount} 个`}
              description="这些账号的活跃度不足，建议结合注册时间和角色观察。"
            />
          ) : null}
        </div>
      )}

      {priorityQueue.length > 0 ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <Typography.Text strong>优先处理队列</Typography.Text>
              <div className="fm-soft-text" style={{ marginTop: 6 }}>
                优先展示被禁用、缺少登录记录或资料完整度较低的账号。
              </div>
            </div>
            <Tag color="gold">候选 {priorityQueue.length}</Tag>
          </div>
          <div className="fm-review-grid">
            {priorityQueue.map(({ item, insights }) => (
              <div key={item.id} className="fm-review-card">
                <div className="fm-review-card__head">
                  <div>
                    <div className="fm-review-card__title">{item.nickname || '未设置昵称'}</div>
                    <div className="fm-review-card__meta">
                      <span>#{String(item.id).padStart(6, '0')}</span>
                      <span>{item.phone || '暂无手机号'}</span>
                    </div>
                  </div>
                  <Space size={8} wrap>
                    <Tag color={insights.riskLevel === 'high' ? 'red' : insights.riskLevel === 'medium' ? 'gold' : 'green'}>
                      {insights.riskLabel}
                    </Tag>
                    {item.status === USER_STATUS.DISABLED ? <Tag color="red">已禁用</Tag> : null}
                  </Space>
                </div>
                <div className="fm-review-card__body">
                  <div className="fm-review-card__line">
                    <UserOutlined />
                    <span>{USER_ROLE_META[item.role]?.label || '未知角色'}</span>
                  </div>
                  <div className="fm-review-card__line">
                    <ExclamationCircleOutlined />
                    <span>完整度 {insights.completeness}% / 最近登录 {item.last_login_at || '暂无'}</span>
                  </div>
                </div>
                <div className="fm-review-card__actions">
                  <Button
                    onClick={() => {
                      setSelectedUser(item);
                      setDetailOpen(true);
                    }}
                  >
                    去处理
                  </Button>
                  <Button
                    type="primary"
                    onClick={async () => {
                      const next = item.status === USER_STATUS.ENABLED ? USER_STATUS.DISABLED : USER_STATUS.ENABLED;
                      const resp = await updateUserStatus(item.id, next);
                      if (resp.code !== 0) {
                        message.error(resp.message || '更新失败');
                        return;
                      }
                      message.success('更新成功');
                      await load();
                    }}
                  >
                    {item.status === USER_STATUS.ENABLED ? '禁用' : '启用'}
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
              placeholder="当前页内搜索手机号、昵称、ID"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
          <Form.Item name="role">
            <Select
              allowClear
              placeholder="全部角色"
              options={[
                { label: '买家', value: 1 },
                { label: '卖家', value: 2 },
                { label: '管理员', value: 3 },
              ]}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select allowClear placeholder="全部状态" options={[{ label: '禁用', value: 0 }, { label: '启用', value: 1 }]} />
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
          <Typography.Text strong>用户列表</Typography.Text>
          <Typography.Text type="secondary">总记录数 {total}</Typography.Text>
        </div>
        <Table<UserItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={visibleRows}
          scroll={{ x: 1120 }}
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
        title="用户详情"
        width={560}
        open={detailOpen}
        destroyOnClose
        onClose={() => {
          setDetailOpen(false);
          setSelectedUser(null);
        }}
      >
        {selectedUser ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {selectedInsights?.riskItems.length ? (
              <Alert
                type={selectedInsights.riskLevel === 'high' ? 'error' : 'warning'}
                showIcon
                message={`当前账号风险：${selectedInsights.riskLabel}`}
                description={selectedInsights.riskItems[0]}
              />
            ) : null}

            <Card className="fm-panel" bordered={false}>
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
                  <UserOutlined />
                </div>
                <div style={{ flex: 1 }}>
                  <Typography.Title level={4} style={{ margin: 0, marginBottom: 8 }}>
                    {selectedUser.nickname || '未设置昵称'}
                  </Typography.Title>
                  <Space wrap>
                    <StatusTag meta={USER_ROLE_META[selectedUser.role]} />
                    <StatusTag meta={USER_STATUS_META[selectedUser.status]} />
                    <Tag color={selectedInsights?.riskLevel === 'high' ? 'red' : selectedInsights?.riskLevel === 'medium' ? 'gold' : 'green'}>
                      {selectedInsights?.riskLabel || '低风险'}
                    </Tag>
                  </Space>
                  <div className="fm-soft-text" style={{ marginTop: 10 }}>
                    手机号 {selectedUser.phone || '暂无'}，最近登录 {selectedUser.last_login_at || '暂无记录'}
                  </div>
                </div>
              </div>

              <div className="fm-inline-stat" style={{ marginBottom: 18 }}>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">资料完整度</div>
                  <div className="fm-inline-stat__value">{selectedInsights?.completeness || 0}%</div>
                </div>
                <div className="fm-inline-stat__item">
                  <div className="fm-inline-stat__label">角色类型</div>
                  <div className="fm-inline-stat__value">{USER_ROLE_META[selectedUser.role]?.label || '-'}</div>
                </div>
              </div>

              <Descriptions column={1} size="small" labelStyle={{ width: 104 }}>
                <Descriptions.Item label="用户 ID">{selectedUser.id}</Descriptions.Item>
                <Descriptions.Item label="手机号">{selectedUser.phone || '暂无'}</Descriptions.Item>
                <Descriptions.Item label="昵称">{selectedUser.nickname || '未设置'}</Descriptions.Item>
                <Descriptions.Item label="角色">
                  <StatusTag meta={USER_ROLE_META[selectedUser.role]} />
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <StatusTag meta={USER_STATUS_META[selectedUser.status]} />
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{selectedUser.created_at}</Descriptions.Item>
                <Descriptions.Item label="最近登录">{selectedUser.last_login_at || '暂无记录'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card className="fm-panel" bordered={false} title="账号判断">
              {selectedInsights?.riskItems.length ? (
                <div>
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
                <div style={{ marginTop: selectedInsights?.riskItems.length ? 18 : 0 }}>
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

            <Card className="fm-panel" bordered={false} title="账号清单">
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

            <Card className="fm-panel" bordered={false} title="运营动作">
              <Space wrap>
                <Button
                  onClick={async () => {
                    const next =
                      selectedUser.status === USER_STATUS.ENABLED ? USER_STATUS.DISABLED : USER_STATUS.ENABLED;
                    const resp = await updateUserStatus(selectedUser.id, next);
                    if (resp.code !== 0) {
                      message.error(resp.message || '更新失败');
                      return;
                    }
                    message.success('更新成功');
                    setDetailOpen(false);
                    await load();
                  }}
                >
                  {selectedUser.status === USER_STATUS.ENABLED ? (
                    <>
                      <StopOutlined /> 禁用账号
                    </>
                  ) : (
                    <>
                      <CheckCircleOutlined /> 恢复账号
                    </>
                  )}
                </Button>
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
