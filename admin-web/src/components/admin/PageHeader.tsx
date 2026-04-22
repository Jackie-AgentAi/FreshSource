import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  extra?: ReactNode;
};

export function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <div className="fm-page-header">
      <div>
        <h1 className="fm-page-header__title">{title}</h1>
        <div className="fm-page-header__description">{description}</div>
      </div>
      {extra ? <div className="fm-page-header__extra">{extra}</div> : null}
    </div>
  );
}
