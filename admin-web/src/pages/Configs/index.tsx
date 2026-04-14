import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Input, Space, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import { listConfigs, updateConfig, type ConfigItem } from '@/services/admin';

export default function ConfigsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConfigItem[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const resp = await listConfigs();
    setLoading(false);
    if (resp.code !== 0) return message.error(resp.message || '加载配置失败');
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

  const columns: ColumnsType<ConfigItem> = [
    { title: 'Key', dataIndex: 'config_key', width: 240 },
    { title: '说明', dataIndex: 'remark' },
    {
      title: '值',
      dataIndex: 'config_value',
      render: (_, row) => (
        <Input
          value={editing[row.config_key]}
          onChange={(e) => setEditing((prev) => ({ ...prev, [row.config_key]: e.target.value }))}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, row) => (
        <Button
          size="small"
          type="primary"
          onClick={async () => {
            const resp = await updateConfig(row.config_key, editing[row.config_key] || '');
            if (resp.code !== 0) return message.error(resp.message || '保存失败');
            message.success('保存成功');
            void load();
          }}
        >
          保存
        </Button>
      ),
    },
  ];

  return (
    <PageContainer title="系统配置">
      <Card extra={<Space><Button onClick={() => void load()}>刷新</Button></Space>}>
        <Table<ConfigItem> rowKey="config_key" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      </Card>
    </PageContainer>
  );
}
