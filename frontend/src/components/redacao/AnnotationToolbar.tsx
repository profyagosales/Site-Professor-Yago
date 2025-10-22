import { HIGHLIGHT_ALPHA, HIGHLIGHT_CATEGORIES, type HighlightCategoryKey } from '@/constants/annotations';
import { hexToRgba } from '@/utils/color';

type AnnotationToolbarProps = {
  active: HighlightCategoryKey;
  onChange: (key: HighlightCategoryKey) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

export function AnnotationToolbar({ active, onChange, orientation = 'horizontal', className }: AnnotationToolbarProps) {
  const isVertical = orientation === 'vertical';
  const baseClasses = isVertical
    ? 'flex flex-col items-stretch gap-3'
    : 'flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2';

  return (
    <div className={`${baseClasses}${className ? ` ${className}` : ''}`}>
      {(
        Object.entries(HIGHLIGHT_CATEGORIES) as Array<[HighlightCategoryKey, { label: string; color: string }]>
      ).map(([key, meta]) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition shadow-sm ${
              isActive ? 'ring-2 ring-offset-2 ring-orange-500' : 'ring-1 ring-transparent'
            } ${isVertical ? 'justify-start text-left' : ''}`}
            style={{
              backgroundColor: hexToRgba(meta.color, HIGHLIGHT_ALPHA),
            }}
            aria-pressed={isActive}
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-none rounded-full"
              style={{ backgroundColor: meta.color }}
              aria-hidden
            />
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AnnotationToolbar;
