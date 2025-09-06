import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-ys-card border border-ys-line rounded-2xl shadow-ys-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-bold text-ys-ink">{children}</h3>;
}

export function CardSub({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ys-ink-2">{children}</p>;
}
