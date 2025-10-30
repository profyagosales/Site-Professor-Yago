import React, { useMemo, useRef, useCallback } from 'react';
import { HIGHLIGHT_ALPHA, HIGHLIGHT_CATEGORIES, type HighlightCategoryKey } from '@/constants/annotations';
import { hexToRgba } from '@/utils/color';

const VARIANT_BY_KEY: Partial<Record<HighlightCategoryKey, string>> = {
  // Ajuste as chaves conforme seu constants/annotations
  // Fallbacks por label também serão aplicados abaixo
};

const COMPACT_LABELS: Partial<Record<HighlightCategoryKey, string>> = {
  // Tente casar com as chaves reais do seu constants/annotations
  argumentacao: 'Arg',
  ortografia: 'Ort',
  coesao: 'Coe',
  apresentacao: 'Apt',
  comentarios: 'Com',
};

function shortLabelFor(key: HighlightCategoryKey, label: string, compact?: boolean): string {
  if (!compact) return label;
  const mapped = COMPACT_LABELS[key];
  if (mapped) return mapped;
  // Fallback: encurta sem perder contexto
  return label.length > 10 ? label.slice(0, 10) : label;
}

function variantFor(key: HighlightCategoryKey, label: string): string {
  const direct = VARIANT_BY_KEY[key as HighlightCategoryKey];
  if (direct) return `btn ${direct}`;
  const t = label.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (t.includes('argument')) return 'btn btn--arg';
  if (t.includes('ortograf') || t.includes('gramat')) return 'btn btn--ort';
  if (t.includes('coes') || t.includes('coer')) return 'btn btn--coe';
  if (t.includes('apresenta')) return 'btn btn--apr';
  if (t.includes('coment')) return 'btn btn--com';
  return 'btn btn--neutral';
}

type AnnotationToolbarProps = {
  active: HighlightCategoryKey;
  onChange: (key: HighlightCategoryKey) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  centered?: boolean;
  compact?: boolean;
};

export function AnnotationToolbar({ active, onChange, orientation = 'horizontal', className, centered = false, compact = false }: AnnotationToolbarProps) {
  const isVertical = orientation === 'vertical';
  const baseClasses = isVertical
    ? `row-span-2 md:sticky md:self-start md:top-[var(--hero-sticky-top,88px)] h-fit flex flex-col ${centered ? 'items-center' : 'items-stretch'} gap-1.5 mt-3 mb-3`
    : 'flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2';

  const entries = useMemo(
    () => Object.entries(HIGHLIGHT_CATEGORIES) as Array<[
      HighlightCategoryKey,
      { label: string; color: string }
    ]>,
    []
  );

  const btnRefs = useRef<Record<HighlightCategoryKey, HTMLButtonElement | null>>({} as any);

  const focusByIndex = useCallback(
    (idx: number) => {
      const tuple = entries[idx];
      if (!tuple) return;
      const key = tuple[0];
      const el = btnRefs.current[key];
      if (el) el.focus();
    },
    [entries]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      const last = entries.length - 1;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          e.preventDefault();
          const next = idx >= last ? 0 : idx + 1;
          focusByIndex(next);
          break;
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          e.preventDefault();
          const prev = idx <= 0 ? last : idx - 1;
          focusByIndex(prev);
          break;
        }
        case 'Home': {
          e.preventDefault();
          focusByIndex(0);
          break;
        }
        case 'End': {
          e.preventDefault();
          focusByIndex(last);
          break;
        }
        case ' ':
        case 'Enter': {
          e.preventDefault();
          const [key] = entries[idx];
          onChange(key);
          break;
        }
      }
    },
    [entries, focusByIndex, onChange]
  );

  return (
    <div
      role="radiogroup"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      aria-label="Selecionar marcador"
      className={`${baseClasses}${className ? ` ${className}` : ''}`}
    >
      {entries.map(([key, meta], idx) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            ref={(el) => (btnRefs.current[key] = el)}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={meta.label}
            title={meta.label}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            data-key={key}
            className={`${variantFor(key, meta.label)} flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/60 ${
              isActive ? 'ring-2 ring-orange-500' : 'ring-1 ring-transparent'
            } ${isVertical ? `justify-start text-left w-full${centered ? ' max-w-[340px] mx-auto' : ''}` : ''}`}
          >
            <span
              className="inline-block h-2 w-2 flex-none rounded-full"
              style={{ backgroundColor: meta.color }}
              aria-hidden
            />
            <span className="text-slate-800 truncate">{shortLabelFor(key, meta.label, compact)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AnnotationToolbar;
