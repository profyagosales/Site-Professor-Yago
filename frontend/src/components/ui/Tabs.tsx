import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export type TabItem =
  | {
      key: string;
      label: ReactNode;
      to: string;
      end?: boolean;
    }
  | {
      key: string;
      label: ReactNode;
      isActive: boolean;
      onClick: () => void;
    };

type TabsProps = {
  items: TabItem[];
  className?: string;
};

const BASE_CLASS =
  'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors';
const ACTIVE_CLASS = 'border-[#FFC28B] bg-[#FBEEDC] text-ys-ink shadow-sm';
const INACTIVE_CLASS = 'border-transparent text-slate-600 hover:bg-black/5 hover:text-slate-900';

export function Tabs({ items, className = '' }: TabsProps) {
  return (
    <nav className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => {
        if ('to' in item) {
          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${BASE_CLASS} ${isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`
              }
            >
              {item.label}
            </NavLink>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`${BASE_CLASS} ${item.isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
