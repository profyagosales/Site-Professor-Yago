import { TERM_OPTIONS, ENTITY_TABS, METRIC_OPTIONS } from "@/features/radar/maps";
type Opt = { label: string; value: string | number | null };

export type ToolbarState = {
  term: 1|2|3|4;
  entity: "student"|"class"|"activity";
  metric: "term_avg";
  classId: string | number | null;
};
export type ToolbarProps = {
  state: ToolbarState;
  onChange: (next: Partial<ToolbarState>) => void;
  classes?: Opt[]; // [{label:'Todas as turmas', value:null}, ...]
};

export default function RankingToolbar({ state, onChange, classes=[] }: ToolbarProps) {
  return (
    <div className="flex flex-wrap gap-12 items-center">
      {/* Bimestre */}
      <div className="flex gap-8">
        {TERM_OPTIONS.map(t => (
          <button
            key={t}
            onClick={() => onChange({ term: t })}
            className={`px-14 py-6 rounded-full text-sm ${state.term===t?'bg-neutral-900 text-white':'bg-neutral-100 text-neutral-700'}`}
          >
            {t}º bim.
          </button>
        ))}
      </div>

      {/* Entidade */}
      <div className="flex gap-8">
        {ENTITY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange({ entity: tab.key })}
            className={`px-14 py-6 rounded-full text-sm ${state.entity===tab.key?'bg-neutral-900 text-white':'bg-neutral-100 text-neutral-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Métrica (fixa em term_avg, mas deixo select p/ futuro) */}
      <div className="flex items-center gap-8">
        <span className="text-sm text-neutral-500">Métrica</span>
        <select
          value={state.metric}
          onChange={(e)=>onChange({ metric: e.target.value as any })}
          className="px-12 py-6 bg-white rounded-lg border"
        >
          {METRIC_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      {/* Turma */}
      <div className="flex items-center gap-8">
        <span className="text-sm text-neutral-500">Turma</span>
        <select
          value={String(state.classId ?? "")}
          onChange={(e)=>onChange({ classId: e.target.value || null })}
          className="px-12 py-6 bg-white rounded-lg border min-w-[220px]"
        >
          {classes.map(c => (
            <option key={String(c.value)} value={String(c.value ?? "")}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
