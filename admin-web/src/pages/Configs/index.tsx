import { ReloadOutlined, SaveOutlined, SearchOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/admin/PageHeader';
import { listConfigs, updateConfig, type ConfigItem } from '@/services/admin';

type ConfigGroup = 'order' | 'shop' | 'system' | 'other';

type ConfigRow = ConfigItem & {
  group: ConfigGroup;
  groupLabel: string;
  dirty: boolean;
};

function getConfigGroup(configKey: string): { group: ConfigGroup; label: string } {
  if (configKey.startsWith('order_')) {
    return { group: 'order', label: '订单规则' };
  }
  if (configKey.startsWith('shop_')) {
    return { group: 'shop', label: '店铺规则' };
  }
  if (configKey.startsWith('system_')) {
    return { group: 'system', label: '系统参数' };
  }
  return { group: 'other', label: '其他配置' };
}

function getConfigRisk(item: ConfigItem, draftValue: string) {
  const trimmed = (draftValue ?? '').trim();
  const isNumericRule = /(minutes|hours|limit|count|stock|fee|threshold)$/i.test(item.config_key);
  const dirty = draftValue !== item.config_value;

  if (!trimmed) {
    return { label: '待补充', color: 'red', hint: '配置值为空，可能影响核心业务规则。' };
  }
  if (isNumericRule && !/^\d+$/.test(trimmed)) {
    return { label: '格式异常', color: 'gold', hint: '该配置更像数值型参数，建议填写整数。' };
  }
  if (dirty) {
    return { label: '待保存', color: 'blue', hint: '当前值已修改，尚未写回后端。' };
  }
  return { label: '正常', color: 'green', hint: '当前配置已同步。' };
}

export default function ConfigsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [rows, setRows] = useState<ConfigItem[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const filters = Form.useWatch([], form);

  const load = async () => {
    setLoading(true);
    const resp = await listConfigs();
    setLoading(false);
    if (resp.code !== 0) {
      message.error(resp.message || '加载配置失败');
      return;
    }
    const list = resp.data?.list || [];
    setRows(list);
    const draft: Record<string, string> = {};
    list.forEach((item) => {
      draft[item.config_key] = item.config_value;
    });
    setEditing(draft);
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleRows = useMemo(() => {
    const keyword = (filters?.keyword || '').trim().toLowerCase();
    const group = filters?.group as ConfigGroup | undefined;
    return rows
      .map((item) => {
        const info = getConfigGroup(item.config_key);
        return {
          ...item,
          group: info.group,
          groupLabel: info.label,
          dirty: editing[item.config_key] !== item.config_value,
        } as ConfigRow;
      })
      .filter((item) => {
        const matchedKeyword =
          !keyword ||
          [item.config_key, item.remark, editing[item.config_key], item.groupLabel].some((field) => field?.toLowerCase().includes(keyword));
        const matchedGroup = !group || item.group === group;
        return matchedKeyword && matchedGroup;
      });
  }, [editing, filters, rows]);

  const dirtyKeys = useMemo(() => rows.filter((item) => editing[item.config_key] !== item.config_value).map((item) => item.config_key), [editing, rows]);
  const invalidDirtyKeys = useMemo(
    () =>
      rows
        .filter((item) => editing[item.config_key] !== item.config_value)
        .filter((item) => getConfigRisk(item, editing[item.config_key] || '').color !== 'blue' && getConfigRisk(item, editing[item.config_key] || '').color !== 'green')
        .map((item) => item.config_key),
    [editing, rows],
  );

  const stats = useMemo(
    () => [
      { label: '配置项', value: rows.length, icon: <SettingOutlined /> },
      { label: '待保存', value: dirtyKeys.length, icon: <SaveOutlined /> },
      { label: '异常草稿', value: invalidDirtyKeys.length, icon: <WarningOutlined /> },
      { label: '最近更新', value: rows[0]?.updated_at?.slice(0, 10) || '暂无', icon: <ReloadOutlined /> },
    ],
    [dirtyKeys.length, invalidDirtyKeys.length, rows],
  );

  const keyConfigs = useMemo(
    () =>
      rows.filter((item) =>
        ['order_auto_cancel_minutes', 'order_auto_complete_hours', 'shop_audit_timeout_hours'].includes(item.config_key),
      ),
    [rows],
  );

  const columns: ColumnsType<ConfigRow> = [
    {
      title: '配置项',
      key: 'config',
      width: 300,
      render: (_, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Typography.Text strong>{row.config_key}</Typography.Text>
            <Tag color="default">{row.groupLabel}</Tag>
            {row.dirty ? <Tag color="blue">未保存</Tag> : null}
          </div>
          <div className="fm-soft-text" style={{ marginTop: 6 }}>
            {row.remark || '暂无说明'}
          </div>
        </div>
      ),
    },
    {
      title: '当前值',
      key: 'value',
      render: (_, row) => (
        <Input
          value={editing[row.config_key]}
          placeholder="请输入配置值"
          onChange={(e) => setEditing((prev) => ({ ...prev, [row.config_key]: e.target.value }))}
        />
      ),
    },
    {
      title: '状态',
      key: 'risk',
      width: 140,
      render: (_, row) => {
        const risk = getConfigRisk(row, editing[row.config_key] || '');
        return <Tag color={risk.color}>{risk.label}</Tag>;
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
            type="primary"
            onClick={async () => {
              const nextValue = editing[row.config_key] || '';
              const risk = getConfigRisk(row, nextValue);
              if (risk.color === 'red') {
                message.error(risk.hint);
                return;
              }
              const resp = await updateConfig(row.config_key, nextValue);
              if (resp.code !== 0) {
                message.error(resp.message || '保存失败');
                return;
              }
              message.success('保存成功');
              await load();
            }}
          >
            保存
          </Button>
          <Button
            size="small"
            onClick={() => setEditing((prev) => ({ ...prev, [row.config_key]: row.config_value }))}
          >
            撤销
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="fm-page">
      <PageHeader
        title="系统配置"
        description="维护平台关键参数、订单时效与系统阈值。"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void load()}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={savingAll}
              disabled={dirtyKeys.length === 0}
              onClick={async () => {
                if (invalidDirtyKeys.length > 0) {
                  message.error('存在格式异常或空值草稿，请先修正后再批量保存');
                  return;
                }
                setSavingAll(true);
                for (const key of dirtyKeys) {
                  const resp = await updateConfig(key, editing[key] || '');
                  if (resp.code !== 0) {
                    setSavingAll(false);
                    message.error(`${key} 保存失败：${resp.message || '未知错误'}`);
                    return;
                  }
                }
                setSavingAll(false);
                message.success('批量保存成功');
                await load();
              }}
            >
              批量保存
            </Button>
          </Space>
        }
      />

      <Card className="fm-panel" bordered={false}>
        <div className="fm-inline-stat">
          {stats.map((item) => (
            <div key={item.label} className="fm-inline-stat__item">
              <div className="fm-inline-stat__label">{item.label}</div>
              <div className="fm-inline-stat__value" style={{ fontSize: typeof item.value === 'string' ? 22 : 28 }}>
                {item.value}
              </div>
              <div className="fm-soft-text" style={{ marginTop: 10 }}>
                {item.icon}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {dirtyKeys.length > 0 ? (
        <Alert
          type={invalidDirtyKeys.length > 0 ? 'warning' : 'info'}
          showIcon
          message={`当前有 ${dirtyKeys.length} 项草稿未保存`}
          description={
            invalidDirtyKeys.length > 0
              ? '其中包含空值或格式异常的配置，请先修正后再保存。'
              : '可以逐项保存，也可以使用右上角“批量保存”一次写回。'
          }
        />
      ) : null}

      {keyConfigs.length > 0 ? (
        <Card className="fm-panel" bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div>
              <Typography.Text strong>关键业务参数</Typography.Text>
              <div className="fm-soft-text" style={{ marginTop: 6 }}>
                这些配置会直接影响订单自动取消、自动完成等核心规则。
              </div>
            </div>
            <Tag color="blue">重点关注</Tag>
          </div>
          <div className="fm-review-grid">
            {keyConfigs.map((item) => {
              const risk = getConfigRisk(item, editing[item.config_key] || '');
              return (
                <div key={item.config_key} className="fm-review-card">
                  <div className="fm-review-card__head">
                    <div>
                      <div className="fm-review-card__title">{item.config_key}</div>
                      <div className="fm-review-card__meta">
                        <span>{item.remark || '暂无说明'}</span>
                      </div>
                    </div>
                    <Tag color={risk.color}>{risk.label}</Tag>
                  </div>
                  <div className="fm-review-card__body">
                    <div className="fm-review-card__line">
                      <SettingOutlined />
                      <span>当前值：{editing[item.config_key] || '未填写'}</span>
                    </div>
                    <div className="fm-review-card__line">
                      <WarningOutlined />
                      <span>{risk.hint}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card className="fm-panel fm-filter-card" bordered={false}>
        <Form form={form} className="fm-filter-form">
          <Form.Item className="fm-filter-form__wide" name="keyword">
            <Input allowClear prefix={<SearchOutlined />} placeholder="搜索配置 key、说明或当前草稿值" />
          </Form.Item>
          <Form.Item name="group">
            <Select
              allowClear
              placeholder="全部分组"
              options={[
                { label: '订单规则', value: 'order' },
                { label: '店铺规则', value: 'shop' },
                { label: '系统参数', value: 'system' },
                { label: '其他配置', value: 'other' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                onClick={() => {
                  form.resetFields();
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
          <Form.Item>
            <Typography.Text type="secondary">筛选会实时生效，重置即可恢复全量配置。</Typography.Text>
          </Form.Item>
        </Form>
      </Card>

      <Card className="fm-panel fm-table-card" bordered={false}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <Typography.Text strong>配置列表</Typography.Text>
          <Typography.Text type="secondary">支持逐项保存与批量保存</Typography.Text>
        </div>
        <Table<ConfigRow>
          rowKey="config_key"
          loading={loading}
          columns={columns}
          dataSource={visibleRows}
          pagination={false}
          scroll={{ x: 1080 }}
        />
      </Card>
    </div>
  );
}
