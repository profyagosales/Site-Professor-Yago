import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-ys-line rounded-2xl bg-white">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

export const Th = ({ children }: { children: ReactNode }) => (
  <th className="text-left font-semibold text-ys-ink bg-ys-bg px-4 py-3 border-b border-ys-line">{children}</th>
);

export const Td = ({ children }: { children: ReactNode }) => (
  <td className="text-ys-ink-2 px-4 py-3 border-b border-ys-line">{children}</td>
);