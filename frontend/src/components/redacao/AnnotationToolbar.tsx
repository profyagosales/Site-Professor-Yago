import { HIGHLIGHT_ALPHA, HIGHLIGHT_CATEGORIES, type HighlightCategoryKey } from '@/constants/annotations';
import { hexToRgba } from '@/utils/color';

type AnnotationToolbarProps = {
  active: HighlightCategoryKey;
  onChange: (key: HighlightCategoryKey) => void;
};

export function AnnotationToolbar({ active, onChange }: AnnotationToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
      {(
        Object.entries(HIGHLIGHT_CATEGORIES) as Array<[HighlightCategoryKey, { label: string; color: string }]>
      ).map(([key, meta]) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition ${
              isActive ? 'ring-2 ring-offset-1 ring-orange-500' : 'ring-1 ring-transparent'
            }`}
            style={{
              backgroundColor: hexToRgba(meta.color, HIGHLIGHT_ALPHA),
            }}
            aria-pressed={isActive}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: meta.color }}
              aria-hidden
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

export default AnnotationToolbar;
