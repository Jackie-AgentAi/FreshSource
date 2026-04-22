import type { ReactNode } from 'react';

import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import './global.less';

export function rootContainer(container: ReactNode) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#10b981',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#3b82f6',
          colorTextBase: '#24332f',
          colorBgBase: '#f6faf7',
          colorBorder: '#e3eee8',
          borderRadius: 18,
          fontFamily:
            '"PingFang SC","Microsoft YaHei","Noto Sans SC",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        },
        components: {
          Layout: {
            bodyBg: '#f6faf7',
            siderBg: '#1f2937',
            headerBg: 'rgba(255, 255, 255, 0.88)',
            triggerBg: '#1f2937',
          },
          Card: {
            borderRadiusLG: 24,
          },
          Button: {
            borderRadius: 14,
            controlHeight: 40,
          },
          Input: {
            borderRadius: 14,
            colorBgContainer: '#f8fbf9',
          },
          Select: {
            borderRadius: 14,
          },
          Table: {
            headerBg: '#f7fbf8',
            borderColor: '#e6f0ea',
            rowHoverBg: '#f4fbf7',
          },
          Modal: {
            borderRadiusLG: 24,
          },
          Menu: {
            darkItemBg: '#1f2937',
            darkSubMenuItemBg: '#1f2937',
            darkItemSelectedBg: '#10b981',
            darkItemHoverBg: '#31404d',
          },
        },
      }}
    >
      <AntdApp>{container}</AntdApp>
    </ConfigProvider>
  );
}
