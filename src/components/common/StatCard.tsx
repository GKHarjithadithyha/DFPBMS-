import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'default' | string;
  badge?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
  variant,
  badge,
  onClick,
}) => {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-4 h-4" />;
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-emerald-300 hover:shadow-md' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="flex items-center space-x-2">
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-600 border border-slate-200">
              {badge}
            </span>
          )}
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
              {renderIcon()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium flex items-center ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{subtitle}</p>
      )}
    </div>
  );
};
