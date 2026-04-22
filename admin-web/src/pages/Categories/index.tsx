import {
  ApartmentOutlined,
  FolderOpenOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/admin/PageHeader';
import { StatusTag } from '@/components/admin/StatusTag';
import { CATEGORY_STATUS, USER_STATUS_META } from '@/constants/status';
import { createCategory, deleteCategory, listCategories, updateCategory, type CategoryItem } from '@/services/admin';

type CategoryFormValues = {
  parent_id: number;
  name: string;
  icon: string;
  sort_order: number;
  status: number;
};

type CategoryTreeRow = CategoryItem & {
  level: number;
  children?: CategoryTreeRow[];
};

type CategoryInsights = {
  riskLabel: string;
  riskColor: string;
  riskItems: string[];
};

function buildTreeRows(items: CategoryItem[], level = 1): CategoryTreeRow[] {
  return items.map((item) => ({
    ...item,
    level,
    children: item.children?.length ? buildTreeRows(item.children, level + 1) : undefined,
  }));
}

function flattenCategories(tree: CategoryTreeRow[]): CategoryTreeRow[] {
  const out: CategoryTreeRow[] = [];
  const visit = (items: CategoryTreeRow[]) => {
    items.forEach((item) => {
      out.push(item);
      if (item.children?.length) {
        visit(item.children);
      }
    });
  };
  visit(tree);
  return out;
}

function collectDescendantIds(item: CategoryTreeRow): number[] {
  const ids: number[] = [];
  const visit = (node: CategoryTreeRow) => {
    node.children?.forEach((child) => {
      ids.push(child.id);
      visit(child);
    });
  };
  visit(item);
  return ids;
}

function filterCategoryTree(items: CategoryTreeRow[], keyword: string): CategoryTreeRow[] {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) {
    return items;
  }
  return items
    .map((item) => {
      const children = item.children ? filterCategoryTree(item.children, keyword) : [];
      const matched = [item.name, item.icon, String(item.id)].some((field) => field?.toLowerCase().includes(trimmed));
      if (!matched && children.length === 0) {
        return null;
      }
      return { ...item, children: children.length ? children : undefined };
    })
    .filter(Boolean) as CategoryTreeRow[];
}

function getCategoryInsights(item: CategoryTreeRow): CategoryInsights {
  const riskItems: string[] = [];
  const childCount = item.children?.length || 0;

  if (item.status === CATEGORY_STATUS.DISABLED) {
    riskItems.push('当前分类已停用，需确认是否仍应对外展示。');
  }
  if (!item.icon) {
    riskItems.push('分类未配置图标，前台展示辨识度较弱。');
  }
  if (item.level === 1 && childCount === 0) {
    riskItems.push('一级分类暂无子类，结构层次可能不完整。');
  }

  if (riskItems.length >= 2) {
    return { riskLabel: '待治理', riskColor: 'red', riskItems };
  }
  if (riskItems.length === 1) {
    return { riskLabel: '需关注', riskColor: 'gold', riskItems };
  }
  return { riskLabel: '健康', riskColor: 'green', riskItems: ['结构与展示信息完整。'] };
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(false);
  const [treeRows, setTreeRows] = useState<CategoryTreeRow[]>([]);
  const [rows, setRows] = useState<CategoryTreeRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryTreeRow | null>(null);
  const [form] = Form.useForm<CategoryFormValues>();

  const load = async () => {
    setLoading(true);
    const resp = await listCategories();
    setLoading(false);
    if (resp.code !== 0) {
      message.error(resp.message || '加载分类失败');
      return;
    }
    const nextTree = buildTreeRows(resp.data || []);
    setTreeRows(nextTree);
    setRows(flattenCategories(nextTree));
  };

  useEffect(() => {
    void load();
  }, []);

  const displayTree = useMemo(() => filterCategoryTree(treeRows, keyword), [keyword, treeRows]);
  const displayRows = useMemo(() => (keyword.trim() ? flattenCategories(displayTree) : displayTree), [displayTree, keyword]);

  const topLevelCount = useMemo(() => rows.filter((item) => item.level === 1).length, [rows]);
  const disabledCount = useMemo(() => rows.filter((item) => item.status === CATEGORY_STATUS.DISABLED).length, [rows]);
  const noIconCount = useMemo(() => rows.filter((item) => !item.icon).length, [rows]);
  const leafCount = useMemo(() => rows.filter((item) => !item.children?.length).length, [rows]);

  const governanceQueue = useMemo(
    () =>
      [...rows]
        .map((item) => ({ item, insights: getCategoryInsights(item) }))
        .sort((a, b) => {
          const score = (entry: { item: CategoryTreeRow; insights: CategoryInsights }) =>
            (entry.insights.riskColor === 'red' ? 100 : entry.insights.riskColor === 'gold' ? 50 : 10) +
            (entry.item.status === CATEGORY_STATUS.DISABLED ? 20 : 0) +
            (!entry.item.icon ? 10 : 0);
          return score(b) - score(a);
        })
        .slice(0, 3),
    [rows],
  );

  const parentOptions = useMemo(() => {
    const blockedIds = editing ? new Set([editing.id, ...collectDescendantIds(editing)]) : new Set<number>();
    return [
      { label: '0 - 顶级分类', value: 0 },
      ...rows
        .filter((item) => !blockedIds.has(item.id))
        .map((item) => ({
          label: `${'— '.repeat(Math.max(item.level - 1, 0))}${item.name} (#${item.id})`,
          value: item.id,
        })),
    ];
  }, [editing, rows]);

  const columns: ColumnsType<CategoryTreeRow> = [
    {
      title: '分类',
      key: 'category',
      width: 280,
      render: (_, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Typography.Text strong>{row.name}</Typography.Text>
            {row.icon ? <Tag color="green">{row.icon}</Tag> : <Tag color="default">无图标</Tag>}
          </div>
          <div className="fm-soft-text" style={{ marginTop: 6 }}>
            #{row.id} / {row.level === 1 ? '一级分类' : `第 ${row.level} 级`}
          </div>
        </div>
      ),
    },
    { title: '父级 ID', dataIndex: 'parent_id', width: 100 },
    {
      title: '子节点',
      key: 'children_count',
      width: 100,
      render: (_, row) => row.children?.length || 0,
    },
    { title: '排序', dataIndex: 'sort_order', width: 90 },
    { title: '状态', dataIndex: 'status', width: 120, render: (value: number) => <StatusTag meta={USER_STATUS_META[value]} /> },
    {
      title: '治理状态',
      key: 'governance',
      width: 120,
      render: (_, row) => {
        const insights = getCategoryInsights(row);
        return <Tag color={insights.riskColor}>{insights.riskLabel}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, row) => (
        <Space wrap>
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
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ parent_id: row.id, status: 1, sort_order: 0, icon: '' });
              setOpen(true);
            }}
          >
            新建子类
          </Button>
          <Button
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: `确认删除分类「${row.name}」？`,
                content: '删除后会影响该分类在后台与前台的展示，请确认已处理关联商品。',
                okText: '确认删除',
                cancelText: '取消',
                okButtonProps: { danger: true },
                onOk: async () => {
                  const resp = await deleteCategory(row.id);
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
        title="分类管理"
        description="维护平台商品分类树、展示层级与前台可读性。"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                form.resetFields();
                form.setFieldsValue({ parent_id: 0, status: 1, sort_order: 0, icon: '' });
                setOpen(true);
              }}
            >
              新建分类
            </Button>
          </Space>
        }
      />

      <Card className="fm-panel" bordered={false}>
        <div className="fm-inline-stat">
          <div className="fm-inline-stat__item">
            <div className="fm-inline-stat__label">分类节点</div>
            <div className="fm-inline-stat__value">{rows.length}</div>
            <div className="fm-soft-text" style={{ marginTop: 10 }}>
              <ApartmentOutlined />
            </div>
          </div>
          <div className="fm-inline-stat__item">
            <div className="fm-inline-stat__label">一级分类</div>
            <div className="fm-inline-stat__value">{topLevelCount}</div>
            <div className="fm-soft-text" style={{ marginTop: 10 }}>
              <FolderOpenOutlined />
            </div>
          </div>
          <div className="fm-inline-stat__item">
            <div className="fm-inline-stat__label">叶子分类</div>
            <div className="fm-inline-stat__value">{leafCount}</div>
            <div className="fm-soft-text" style={{ marginTop: 10 }}>
              <NodeIndexOutlined />
            </div>
          </div>
          <div className="fm-inline-stat__item">
            <div className="fm-inline-stat__label">待治理</div>
            <div className="fm-inline-stat__value">{disabledCount + noIconCount}</div>
            <div className="fm-soft-text" style={{ marginTop: 10 }}>
              <SettingOutlined />
            </div>
          </div>
        </div>
      </Card>

      {(disabledCount > 0 || noIconCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {disabledCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`当前共 ${disabledCount} 个停用分类`}
              description="建议复核这些分类是否仍需保留，避免前台导航与后台类目结构脱节。"
            />
          ) : null}
          {noIconCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`当前共 ${noIconCount} 个分类缺少图标`}
              description="缺少图标会降低前台识别度，建议优先补齐一级分类与高频类目。"
            />
          ) : null}
        </div>
      )}

      {governanceQueue.length > 0 ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <Typography.Text strong>优先治理分类</Typography.Text>
              <div className="fm-soft-text" style={{ marginTop: 6 }}>
                优先展示停用、缺少图标或一级类目结构不完整的分类节点。
              </div>
            </div>
            <Tag color="gold">候选 {governanceQueue.length}</Tag>
          </div>
          <div className="fm-review-grid">
            {governanceQueue.map(({ item, insights }) => (
              <div key={item.id} className="fm-review-card">
                <div className="fm-review-card__head">
                  <div>
                    <div className="fm-review-card__title">{item.name}</div>
                    <div className="fm-review-card__meta">
                      <span>#{item.id}</span>
                      <span>{item.level === 1 ? '一级分类' : `第 ${item.level} 级`}</span>
                    </div>
                  </div>
                  <Tag color={insights.riskColor}>{insights.riskLabel}</Tag>
                </div>
                <div className="fm-review-card__body">
                  {insights.riskItems.slice(0, 2).map((risk) => (
                    <div key={risk} className="fm-review-card__line">
                      <SettingOutlined />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
                <div className="fm-review-card__actions">
                  <Button
                    onClick={() => {
                      setEditing(item);
                      form.setFieldsValue({
                        parent_id: item.parent_id,
                        name: item.name,
                        icon: item.icon || '',
                        sort_order: item.sort_order,
                        status: item.status,
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
        <Form className="fm-filter-form">
          <Form.Item className="fm-filter-form__wide">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索分类名、图标或分类 ID"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card className="fm-panel fm-table-card" bordered={false}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <Typography.Text strong>{keyword.trim() ? '筛选结果' : '分类树结构'}</Typography.Text>
          <Typography.Text type="secondary">{keyword.trim() ? `匹配 ${displayRows.length} 条` : `共 ${rows.length} 条分类节点`}</Typography.Text>
        </div>
        <Table<CategoryTreeRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={displayRows}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        open={open}
        title={editing ? `编辑分类 · ${editing.name}` : '新建分类'}
        destroyOnClose
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const values = await form.validateFields();
          const payload = {
            parent_id: values.parent_id ?? 0,
            name: values.name.trim(),
            icon: (values.icon || '').trim(),
            sort_order: values.sort_order ?? 0,
            status: values.status ?? 1,
          };
          const resp = editing ? await updateCategory(editing.id, payload) : await createCategory(payload);
          if (resp.code !== 0) {
            message.error(resp.message || '提交失败');
            return;
          }
          message.success(editing ? '分类已更新' : '分类已创建');
          setOpen(false);
          await load();
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ parent_id: 0, sort_order: 0, status: 1, icon: '' }}>
          <Form.Item name="parent_id" label="父级分类">
            <Select showSearch optionFilterProp="label" options={parentOptions} />
          </Form.Item>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { min: 2, message: '分类名称至少 2 个字符' },
              { max: 20, message: '分类名称不超过 20 个字符' },
            ]}
          >
            <Input maxLength={20} placeholder="例如：水果蔬菜" />
          </Form.Item>
          <Form.Item name="icon" label="图标标识" rules={[{ max: 30, message: '图标标识不超过 30 个字符' }]}>
            <Input maxLength={30} placeholder="例如：leaf / fruit / seafood" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序值">
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { label: '启用', value: CATEGORY_STATUS.ENABLED },
                { label: '禁用', value: CATEGORY_STATUS.DISABLED },
              ]}
            />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message={editing ? '编辑当前分类' : '创建新的分类节点'}
            description={
              editing
                ? '父级分类列表已自动排除当前节点及其子节点，避免形成错误的树结构。'
                : '如果要创建一级分类，请保持父级分类为“顶级分类”。'
            }
          />
        </Form>
      </Modal>
    </div>
  );
}
