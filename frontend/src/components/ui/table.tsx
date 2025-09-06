import type { ReactNode, TableHTMLAttributes } from "react";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "", ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table 
        className={`min-w-full divide-y divide-ys-line ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <thead className={`bg-ys-bg ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <tbody className={`bg-white divide-y divide-ys-line ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <tr className={`hover:bg-ys-bg ${className}`}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-ys-ink ${className}`}>
      {children}
    </td>
  );
}

export function TableHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-ys-ink-2 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

// Aliases para compatibilidade
export const Th = TableHeader;
export const Td = TableCell;
