import type { ReactNode } from 'react';

import { Card } from 'antd';

type MetricCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  footer?: ReactNode;
  accent: string;
  iconBg: string;
};

export function MetricCard({ label, value, icon, footer, accent, iconBg }: MetricCardProps) {
  return (
    <Card className="fm-panel fm-stat-card" styles={{ body: { borderTop: `4px solid ${accent}` } }}>
      <div className="fm-stat-card__head">
        <div>
          <div className="fm-stat-card__label">{label}</div>
          <div className="fm-stat-card__value">{value}</div>
        </div>
        <div className="fm-stat-card__icon" style={{ background: iconBg, color: accent }}>
          {icon}
        </div>
      </div>
      {footer ? <div className="fm-stat-card__footer">{footer}</div> : null}
    </Card>
  );
}
