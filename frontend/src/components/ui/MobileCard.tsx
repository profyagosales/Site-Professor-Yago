import type { ReactNode } from 'react';

type MobileCardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function MobileCard({
  children,
  className = '',
  onClick,
}: MobileCardProps) {
  return (
    <div
      className={`card-responsive ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Componente específico para cards de dados de tabela
type TableCardProps = {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; value: ReactNode; className?: string }>;
  actions?: ReactNode;
  className?: string;
};

export function TableCard({
  title,
  subtitle,
  data,
  actions,
  className = '',
}: TableCardProps) {
  return (
    <MobileCard className={className}>
      <div className='space-y-3'>
        {/* Header */}
        <div className='flex items-start justify-between'>
          <div>
            <h3 className='font-semibold text-ys-ink text-base'>{title}</h3>
            {subtitle && (
              <p className='text-sm text-ys-ink-2 mt-1'>{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className='flex items-center space-x-2'>{actions}</div>
          )}
        </div>

        {/* Data Fields */}
        <div className='space-y-2'>
          {data.map((item, index) => (
            <div
              key={index}
              className={`flex justify-between items-center ${item.className || ''}`}
            >
              <span className='text-sm font-medium text-ys-ink-2'>
                {item.label}:
              </span>
              <span className='text-sm text-ys-ink text-right'>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MobileCard>
  );
}
