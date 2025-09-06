import type { ReactNode } from 'react';

type TableProps = {
  children: ReactNode;
  minWidth?: string;
  className?: string;
};

export function Table({
  children,
  minWidth = '600px',
  className = '',
}: TableProps) {
  return (
    <div
      className={`table-responsive border border-ys-line rounded-2xl bg-white ${className}`}
    >
      <table className='min-w-full text-sm' style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const Th = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <th
    className={`text-left font-semibold text-ys-ink bg-ys-bg px-3 py-3 border-b border-ys-line whitespace-nowrap ${className}`}
  >
    {children}
  </th>
);

export const Td = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <td
    className={`text-ys-ink-2 px-3 py-3 border-b border-ys-line ${className}`}
  >
    {children}
  </td>
);

// Componente para tabelas responsivas com cards em mobile
export function ResponsiveTable({
  children,
  mobileCardComponent,
  className = '',
}: {
  children: ReactNode;
  mobileCardComponent?: ReactNode;
  className?: string;
}) {
  return (
    <>
      {/* Desktop Table */}
      <div className={`hidden md:block ${className}`}>
        <Table>{children}</Table>
      </div>

      {/* Mobile Cards */}
      {mobileCardComponent && (
        <div className={`md:hidden space-y-3 ${className}`}>
          {mobileCardComponent}
        </div>
      )}
    </>
  );
}
