import { useMemo, type FormEvent } from 'react';
import { ENEM_2024 } from '@/features/essay/rubrics/enem2024';
import EnemScoringForm, {
  type EnemSelectionsMap,
} from '@/components/essay/EnemScoringForm';
import { buildJustificationFromReasonIds } from '@/features/enem/composerBridge';
import { ENEM_COLORS_HEX, toRoman } from '@/features/redacao/pdf/theme';

export const ANNUL_OPTIONS = [
  { key: 'MENOS_7_LINHAS', label: 'Menos de 7 linhas' },
  { key: 'FUGA_TEMA', label: 'Fuga ao tema' },
  { key: 'COPIA', label: 'Cópia' },
  { key: 'ILEGIVEL', label: 'Ilegível' },
  { key: 'FUGA_GENERO', label: 'Fuga ao gênero' },
  { key: 'OUTROS', label: 'Outros (especificar)', hasInput: true },
] as const;

const SUMMARY_TOKEN_SET = new Set([
  'E',
  'OU',
  'E/OU',
  'COM',
  'MAS',
  'NÃO',
  'NENHUMA',
  'ALGUMA',
  'ALGUMAS',
]);

function renderEnemSummaryText(text: string, palette: { strong: string; title: string }) {
  return text.split(/(\s+)/).map((part, index) => {
    if (part.trim().length === 0) {
      return <span key={`sum-${index}`}>{part}</span>;
    }
    const cleaned = part.replace(/[.,;:!?)]$/, '').replace(/^[(]/, '');
    const upper = cleaned.toUpperCase();
    const isToken = SUMMARY_TOKEN_SET.has(upper);
    const isUpper = cleaned.length >= 3 && cleaned === cleaned.toUpperCase();
    if (isToken || isUpper) {
      return (
        <span key={`sum-${index}`} style={{ color: palette.strong, fontWeight: 700 }}>
          {part}
        </span>
      );
    }
    return <span key={`sum-${index}`} style={{ color: '#1f2937' }}>{part}</span>;
  });
}

export type PasState = {
  apresentacao: string;
  argumentacao: string;
  adequacao: string;
  coesao: string;
  TL: string;
  erros: {
    grafia: string;
    pontuacao: string;
    propriedade: string;
  };
};

export type PasFieldKey =
  | 'apresentacao'
  | 'argumentacao'
  | 'adequacao'
  | 'coesao'
  | 'TL'
  | 'erros.grafia'
  | 'erros.pontuacao'
  | 'erros.propriedade';

type CorrectionMirrorProps = {
  type: 'PAS' | 'ENEM' | null | undefined;
  annulState: Record<string, boolean>;
  annulOther: string;
  onToggleAnnul: (key: string, checked: boolean) => void;
  onAnnulOtherChange: (value: string) => void;
  annulled: boolean;
  pasState: PasState;
  onPasChange: (field: PasFieldKey, value: string) => void;
  enemSelections: EnemSelectionsMap;
  onEnemSelectionChange: (
    key: keyof EnemSelectionsMap,
    selection: { level: number; reasonIds: string[]; justification?: string }
  ) => void;
  enemTotal: number;
};

export function CorrectionMirror({
  type,
  annulState,
  annulOther,
  onToggleAnnul,
  onAnnulOtherChange,
  annulled,
  pasState,
  onPasChange,
  enemSelections,
  onEnemSelectionChange,
  enemTotal,
}: CorrectionMirrorProps) {
  type MacroKey = 'apresentacao' | 'argumentacao' | 'adequacao' | 'coesao';
  type MacroRow =
    | { type: 'group'; id: string; label: string }
    | { type: 'item'; id: string; label: string; range: string; key: MacroKey; max: number; step: number };
  const macroRows: MacroRow[] = [
    {
      type: 'item',
      id: '1',
      label: 'Apresentação',
      range: '0,00 a 0,50',
      key: 'apresentacao',
      max: 0.5,
      step: 0.1,
    },
    { type: 'group', id: '2', label: 'Desenvolvimento do tema' },
    {
      type: 'item',
      id: '2.1',
      label: 'Conteúdo',
      range: '0,00 a 4,50',
      key: 'argumentacao',
      max: 4.5,
      step: 0.1,
    },
    {
      type: 'item',
      id: '2.2',
      label: 'Gênero textual',
      range: '0,00 a 2,00',
      key: 'adequacao',
      max: 2,
      step: 0.1,
    },
    {
      type: 'item',
      id: '2.3',
      label: 'Coesão e coerência',
      range: '0,00 a 3,00',
      key: 'coesao',
      max: 3,
      step: 0.1,
    },
  ];
  const macroItemRows = macroRows.filter((row): row is Extract<MacroRow, { type: 'item' }> => row.type === 'item');
  const errorRows: Array<{ key: keyof PasState['erros']; label: string }> = [
    { key: 'grafia', label: 'Grafia / Acentuação' },
    { key: 'pontuacao', label: 'Pontuação / Morfossintaxe' },
    { key: 'propriedade', label: 'Propriedade vocabular' },
  ];

  const handlePasFieldChange =
    (field: PasFieldKey) =>
    (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onPasChange(field, event.currentTarget.value);
    };

  const pasComputed = useMemo(() => {
    const parseMacro = (value: string, max: number) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return null;
      return Math.min(Math.max(num, 0), max);
    };
    const macros = {
      apresentacao: parseMacro(pasState.apresentacao, 0.5),
      argumentacao: parseMacro(pasState.argumentacao, 4.5),
      adequacao: parseMacro(pasState.adequacao, 2),
      coesao: parseMacro(pasState.coesao, 3),
    };
    const macroSum = Object.values(macros).reduce((acc, value) => acc + (value ?? 0), 0);
    const nc = Number(macroSum.toFixed(2));

    const tlRaw = Number(pasState.TL);
    const tl = Number.isFinite(tlRaw) ? Math.min(Math.max(tlRaw, 8), 30) : null;

    const parseError = (value: string) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return 0;
      return Math.max(0, Math.floor(num));
    };
    const errorCounts = {
      grafia: parseError(pasState.erros.grafia),
      pontuacao: parseError(pasState.erros.pontuacao),
      propriedade: parseError(pasState.erros.propriedade),
    };
    const errors = { ...errorCounts };
    const ne = errorCounts.grafia + errorCounts.pontuacao + errorCounts.propriedade;
    const discount = tl && tl > 0 ? Number((2 / tl).toFixed(3)) : null;
    let nr: number | null = null;
    if (!annulled && discount != null) {
      nr = Number(Math.max(0, nc - ne * discount).toFixed(2));
    }
    if (annulled) {
      nr = 0;
    }

    return {
      macros,
      nc,
      tl,
      errors,
      ne,
      discount,
      nr,
    };
  }, [annulled, pasState]);

  const formatNumber = (value: number | null | undefined, fraction = 2) =>
    value != null && Number.isFinite(value) ? value.toFixed(fraction) : '—';

  const formattedPasResult = formatNumber(pasComputed.nr);

return (
    <section className="mt-4 w-full min-w-0 max-w-none md:-ml-2 rounded-2xl border border-orange-100 bg-white/90 p-2 shadow-sm ring-1 ring-orange-50/60 backdrop-blur-sm lg:p-3">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900">Espelho do aluno</h2>
          <p className="text-xs text-slate-600">
            Revise motivos de anulação e notas antes de gerar o PDF final.
          </p>
        </div>
      </div>

      <div className="mt-4 w-full min-w-0 max-w-none">
        <div className="space-y-3 w-full">
          <div className="w-full rounded-xl border border-dashed border-slate-300 bg-white p-2 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-800 leading-tight truncate">Anulação</h3>
            <p className="mt-1 text-[11px] text-slate-500 leading-snug">
              Selecione os motivos aplicáveis. Quando marcado, a nota final é zerada automaticamente.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ANNUL_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className={`flex items-start gap-2 rounded-lg border px-2 py-1 text-[12px] transition ${
                    annulState[opt.key]
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-orange-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    checked={annulState[opt.key] || false}
                    onChange={(event) => onToggleAnnul(opt.key, event.target.checked)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {annulState.OUTROS && (
              <textarea
                value={annulOther}
                onChange={(event) => onAnnulOtherChange(event.target.value)}
                placeholder="Descreva o motivo"
                className="mt-2.5 w-full rounded-lg border border-orange-200 bg-orange-50 p-1 text-[12px] text-orange-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                rows={2}
              />
            )}
          </div>

            {annulled && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-[13px] text-red-700 shadow-sm">
              Redação anulada. A nota final será 0 e o espelho completo ficará oculto para o aluno.
            </div>
          )}

          {!annulled && type === 'PAS' && (
            <div className="pas-macro-card w-full space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-2 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-[12px] font-semibold text-slate-800 leading-tight truncate">MACROESTRUTURAIS</h3>
                <p className="text-[11px] leading-tight text-slate-500">NR = NC − 2 × (NE / TL)</p>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-2 text-[12px] leading-tight shadow-sm">
                <h4 className="text-[12px] font-semibold text-slate-800">Resumo do espelho</h4>
                <p className="text-[11px] text-slate-500">NR = NC − 2 × (NE / TL)</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                  <dt className="text-[11px] text-slate-500">NC</dt>
                  <dd className="text-right font-semibold" style={{ color: 'var(--pas-macro-title)' }}>{formatNumber(pasComputed.nc)}</dd>
                  <dt className="text-[11px] text-slate-500">TL</dt>
                  <dd className="text-right">{pasComputed.tl ?? '—'}</dd>
                  <dt className="text-[11px] text-slate-500">NE</dt>
                  <dd className="text-right">{pasComputed.ne}</dd>
                  <dt className="text-[11px] text-slate-500">Desconto</dt>
                  <dd className="text-right">{pasComputed.discount != null ? pasComputed.discount.toFixed(3) : '—'}</dd>
                  <dt className="col-span-2 mt-1 text-[11px] text-slate-500">Nota final (NR)</dt>
                  <dd className="col-span-2 text-right text-[18px] font-semibold text-slate-900">
                    {formattedPasResult}
                  </dd>
                </dl>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-[12px] text-slate-700">
                  <thead className="bg-white text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-1.5 py-1 text-left font-medium">Quesitos avaliados</th>
                      <th className="px-1.5 py-1 text-left font-medium whitespace-nowrap">Faixa de valor</th>
                      <th className="px-1.5 py-1 text-left font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {macroRows.map((row) =>
                      row.type === 'group' ? (
                        <tr key={row.id} className="bg-slate-50">
                          <td className="px-1.5 py-1 leading-tight font-semibold text-slate-600">
                            <span className="mr-1">{row.id}.</span>
                            <span className="inline-block max-w-[42ch] align-bottom line-clamp-1">{row.label}</span>
                          </td>
                          <td className="px-1.5 py-1 leading-tight text-slate-400" colSpan={2}>
                            —
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id}>
                          <td className="px-1.5 py-1 leading-tight">
                            <span className="mr-1 font-semibold text-slate-800">{row.id}</span>
                            <span className="inline-block max-w-[46ch] align-bottom line-clamp-2">{row.label}</span>
                          </td>
                          <td
                            className="px-1.5 py-1 leading-tight whitespace-nowrap"
                            style={{ color: 'var(--pas-macro-title)' }}
                          >
                            {row.range}
                          </td>
                          <td className="px-1.5 py-1 leading-tight">
                            <input
                              type="number"
                              min={0}
                              max={row.max}
                              step={row.step}
                              value={pasState[row.key]}
                              onInput={handlePasFieldChange(row.key)}
                              onWheel={(e) => e.currentTarget.blur()}
                              inputMode="decimal"
                              tabIndex={row.id === '1' ? 1 : row.id === '2.1' ? 2 : row.id === '2.2' ? 3 : row.id === '2.3' ? 4 : undefined}
                              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-[12px] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 text-right"
                            />
                          </td>
                        </tr>
                      )
                    )}
                    <tr>
                    <td className="px-1.5 py-1 leading-tight font-semibold" style={{ color: 'var(--pas-macro-title)' }}>Nota de conteúdo (NC)</td>
                    <td className="px-1.5 py-1 leading-tight" style={{ color: 'var(--pas-macro-title)' }}>0,00 a 10,00</td>
                    <td className="px-1.5 py-1 leading-tight font-semibold" style={{ color: 'var(--pas-macro-title)' }}>{formatNumber(pasComputed.nc)}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <div className="pas-micro-card w-full rounded-lg border border-pink-200 bg-pink-50 p-2 text-[12px] text-slate-700 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <h4 className="text-[12px] font-semibold text-slate-800 truncate">MICROESTRUTURAIS</h4>
                  <span className="text-[11px] leading-tight text-slate-500">Avalie TL e contagem de erros</span>
                </div>
                <div className="space-y-2.5">
                  <label className="flex flex-col text-[11px] font-medium text-slate-600">
                    TL (número total de linhas)
                    <input
                      type="number"
                      min={8}
                      max={30}
                      step={1}
                      value={pasState.TL}
                      onInput={handlePasFieldChange('TL')}
                      onWheel={(e) => e.currentTarget.blur()}
                      inputMode="numeric"
                      tabIndex={5}
                      className="mt-1 w-20 rounded-lg border border-slate-300 px-2 py-1 text-[12px] text-right outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                    />
                  </label>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-slate-700">
                      <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-1.5 py-1 text-left font-medium">Tipo de erro</th>
                          <th className="px-1.5 py-1 text-left font-medium">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {errorRows.map((row) => (
                          <tr key={row.key}>
                            <td className="px-1.5 py-1 leading-tight">{row.label}</td>
                            <td className="px-1.5 py-1 leading-tight">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={pasState.erros[row.key]}
                                onInput={handlePasFieldChange(`erros.${row.key}` as PasFieldKey)}
                                onWheel={(e) => e.currentTarget.blur()}
                                inputMode="numeric"
                                tabIndex={row.key === 'grafia' ? 6 : row.key === 'pontuacao' ? 7 : row.key === 'propriedade' ? 8 : undefined}
                                className="w-14 rounded-lg border border-slate-300 px-2 py-1 text-[12px] text-right outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!annulled && type === 'ENEM' && (
            <>
              <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
                <h3 className="text-[12px] font-semibold text-slate-800 truncate">Resumo das competências</h3>
                <div className="mt-2 space-y-2">
                  {ENEM_2024.map((competency) => {
                    const selection = enemSelections[competency.key];
                    const level = selection?.level ?? competency.levels[0]?.level ?? 0;
                    const trimmed = selection?.justification?.trim();
                    const composed = buildJustificationFromReasonIds(competency.key, level, selection?.reasonIds ?? []);
                    const justification =
                      (trimmed && trimmed.length > 0 ? trimmed : undefined) ??
                      composed ??
                      '— nenhuma justificativa selecionada —';
                    const palette = ENEM_COLORS_HEX[competency.key];
                    const roman = toRoman(parseInt(competency.key.replace('C', ''), 10) || 0);
                    return (
                      <div key={competency.key} className="rounded-xl border border-slate-200/60 bg-slate-50/70 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold" style={{ color: palette.title }}>
                            Competência {roman}
                          </span>
                          <span className="text-[10px] font-medium" style={{ color: palette.title }}>
                            Nível <span style={{ color: palette.strong }}>{level}</span>
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-snug text-slate-600">
                          {renderEnemSummaryText(justification, palette)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-[13px] w-full"><EnemScoringForm selections={enemSelections} onChange={onEnemSelectionChange} /></div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}


export default CorrectionMirror;
