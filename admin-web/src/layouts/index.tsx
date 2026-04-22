import {
  AppstoreOutlined,
  BellOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DownOutlined,
  LogoutOutlined,
  PictureOutlined,
  SearchOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Avatar, Badge, Dropdown, Input, Layout, Menu, Space, Typography } from 'antd';
import { history, Outlet } from '@umijs/max';
import { useEffect, useMemo, useState } from 'react';

import { clearTokens, getAccessToken, getAdminPhone } from '@/utils/token';

const { Sider, Header, Content } = Layout;

type NavigationItem = Required<MenuProps>['items'][number];

const navigationItems: NavigationItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  {
    key: 'shops-group',
    icon: <ShopOutlined />,
    label: '店铺管理',
    children: [{ key: '/shops', label: '入驻审核与店铺列表' }],
  },
  {
    key: 'products-group',
    icon: <AppstoreOutlined />,
    label: '商品管理',
    children: [{ key: '/products', label: '商品审核与推荐' }],
  },
  { key: '/categories', icon: <ClusterOutlined />, label: '分类管理' },
  { key: '/orders', icon: <ShoppingCartOutlined />, label: '订单管理' },
  {
    key: 'content-group',
    icon: <PictureOutlined />,
    label: '内容管理',
    children: [{ key: '/banners', label: '轮播图管理' }],
  },
  {
    key: 'settings-group',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [{ key: '/configs', label: '参数配置' }],
  },
];

const parentByPath: Record<string, string> = {
  '/shops': 'shops-group',
  '/products': 'products-group',
  '/banners': 'content-group',
  '/configs': 'settings-group',
};

export default function AdminLayout() {
  const pathname = history.location.pathname;
  const [openKeys, setOpenKeys] = useState<string[]>(
    parentByPath[pathname] ? [parentByPath[pathname]] : ['shops-group', 'products-group', 'content-group', 'settings-group'],
  );

  useEffect(() => {
    if (!getAccessToken()) {
      history.push('/login');
    }
  }, [pathname]);

  useEffect(() => {
    const nextParent = parentByPath[pathname];
    if (nextParent) {
      setOpenKeys((prev) => (prev.includes(nextParent) ? prev : [...prev, nextParent]));
    }
  }, [pathname]);

  const profileMenu = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
      },
    ],
    [],
  );

  return (
    <Layout className="fm-admin-shell">
      <Sider width={272} className="fm-admin-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="fm-admin-brand">
          <div className="fm-admin-brand__logo">F</div>
          <div>
            <h1 className="fm-admin-brand__title">FreshMart</h1>
            <div className="fm-admin-brand__subtitle">运营管理后台</div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          className="fm-admin-menu"
          selectedKeys={[pathname === '' ? '/' : pathname]}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          onClick={({ key }) => {
            if (typeof key === 'string' && key.startsWith('/')) {
              history.push(key);
            }
          }}
          items={navigationItems}
        />
      </Sider>
      <Layout>
        <Header className="fm-admin-header">
          <Input
            allowClear
            className="fm-admin-header__search"
            prefix={<SearchOutlined className="fm-soft-text" />}
            placeholder="搜索订单、商品、店铺..."
            size="large"
          />
          <Space size={20}>
            <Badge count={5} size="small">
              <Avatar shape="square" icon={<BellOutlined />} style={{ background: '#eefbf5', color: '#10b981' }} />
            </Badge>
            <Dropdown
              menu={{
                items: profileMenu,
                onClick: ({ key }) => {
                  if (key === 'logout') {
                    clearTokens();
                    history.push('/login');
                  }
                },
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: '#10b981' }}>管</Avatar>
                <div>
                  <Typography.Text strong style={{ display: 'block', lineHeight: 1.1 }}>
                    平台管理员
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {getAdminPhone() || 'admin@freshmart.com'}
                  </Typography.Text>
                </div>
                <DownOutlined className="fm-soft-text" />
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="fm-admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
