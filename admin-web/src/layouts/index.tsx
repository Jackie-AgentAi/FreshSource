import { ProLayout } from '@ant-design/pro-components';
import { history, Outlet } from '@umijs/max';

import { clearTokens } from '@/utils/token';

export default function Layout() {
  return (
    <ProLayout
      title="FreshMart Admin"
      route={{
        path: '/',
        routes: [
          { path: '/', name: '工作台' },
          { path: '/users', name: '用户管理' },
          { path: '/shops', name: '店铺管理' },
          { path: '/products', name: '商品管理' },
          { path: '/categories', name: '分类管理' },
          { path: '/orders', name: '订单管理' },
          { path: '/banners', name: '轮播管理' },
          { path: '/configs', name: '系统配置' },
        ],
      }}
      location={{ pathname: history.location.pathname }}
      menuItemRender={(item, dom) => (
        <a
          onClick={(e) => {
            e.preventDefault();
            history.push(item.path || '/');
          }}
        >
          {dom}
        </a>
      )}
      avatarProps={{
        title: 'Admin',
        render: (_, dom) => (
          <a
            onClick={(e) => {
              e.preventDefault();
              clearTokens();
              history.push('/login');
            }}
          >
            {dom}
          </a>
        ),
      }}
    >
      <Outlet />
    </ProLayout>
  );
}
