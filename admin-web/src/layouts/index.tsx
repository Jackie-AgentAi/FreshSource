import { ProLayout } from '@ant-design/pro-components';
import { history, Outlet } from '@umijs/max';

import { clearTokens } from '@/utils/token';

export default function Layout() {
  return (
    <ProLayout
      title="FreshMart Admin"
      route={{
        path: '/',
        routes: [{ path: '/', name: '工作台' }],
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
