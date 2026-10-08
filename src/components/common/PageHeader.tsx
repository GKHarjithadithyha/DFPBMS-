import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string; onClick?: () => void }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300">/</span>}
              {crumb.onClick ? (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  className="hover:text-emerald-600 font-medium transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={idx === breadcrumbs.length - 1 ? 'text-slate-800 font-semibold' : ''}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-sans">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 font-normal">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center flex-wrap gap-2.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
