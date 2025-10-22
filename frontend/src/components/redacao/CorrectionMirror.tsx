import { useMemo, type FormEvent } from 'react';
import { ENEM_2024 } from '@/features/essay/rubrics/enem2024';
import EnemScoringForm, {
  type EnemSelectionsMap,
} from '@/components/essay/EnemScoringForm';

export const ANNUL_OPTIONS = [
  { key: 'MENOS_7_LINHAS', label: 'Menos de 7 linhas' },
  { key: 'FUGA_TEMA', label: 'Fuga ao tema' },
  { key: 'COPIA', label: 'Cópia' },
  { key: 'ILEGIVEL', label: 'Ilegível' },
  { key: 'FUGA_GENERO', label: 'Fuga ao gênero' },
  { key: 'OUTROS', label: 'Outros (especificar)', hasInput: true },
] as const;

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
  onEnemSelectionChange: (key: keyof EnemSelectionsMap, selection: { level: number; reasonIds: string[] }) => void;
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
      label: 'Apresentação (legibilidade, respeito às margens e indicação de parágrafo)',
      range: '0,00 a 0,50',
      key: 'apresentacao',
      max: 0.5,
      step: 0.1,
    },
    { type: 'group', id: '2', label: 'Desenvolvimento do tema' },
    {
      type: 'item',
      id: '2.1',
      label: 'Consistência da argumentação e progressão temática',
      range: '0,00 a 4,50',
      key: 'argumentacao',
      max: 4.5,
      step: 0.1,
    },
    {
      type: 'item',
      id: '2.2',
      label: 'Adequação ao tipo e ao gênero textual',
      range: '0,00 a 2,00',
      key: 'adequacao',
      max: 2,
      step: 0.1,
    },
    {
      type: 'item',
      id: '2.3',
      label: 'Coesão e coerências',
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

  const previewPasScore = pasComputed.nr != null ? pasComputed.nr : 0;
  const previewScore = annulled ? 0 : type === 'PAS' ? previewPasScore : type === 'ENEM' ? enemTotal : 0;
  const previewLabel = annulled ? 'Redação anulada' : type === 'PAS' ? 'NR prevista' : 'Total ENEM';
  const formattedPasResult = formatNumber(pasComputed.nr);
  const formattedPreviewScore = type === 'PAS'
    ? (pasComputed.nr != null ? formattedPasResult : '—')
    : previewScore.toString();

  return (
    <section className="mt-6 rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm ring-1 ring-orange-50/60 backdrop-blur-sm lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Espelho do aluno</h2>
          <p className="text-sm text-slate-600">
            Revise motivos de anulação e notas antes de gerar o PDF final.
          </p>
        </div>
        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 sm:text-sm">
          <div
            className={`min-w-[160px] rounded-xl border px-4 py-3 text-right shadow-sm transition ${
              annulled
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-orange-200 bg-gradient-to-br from-orange-50 to-white text-orange-600'
            }`}
          >
            <p className="text-[11px] uppercase tracking-wide">{previewLabel}</p>
            <p className="text-xl font-semibold text-slate-900">
              {annulled ? '0' : formattedPreviewScore}
              {!annulled && type === 'ENEM' ? <span className="ml-1 text-sm text-slate-500">/ 1000</span> : null}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Status</p>
            <p className="text-base font-semibold text-slate-800">
              {annulled ? 'Anulada' : type === 'PAS' ? 'PAS/UnB' : type === 'ENEM' ? 'ENEM' : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Anulação da redação</h3>
            <p className="mt-1 text-xs text-slate-500">
              Selecione os motivos aplicáveis. Quando marcado, a nota final é zerada automaticamente.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ANNUL_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
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
                className="mt-3 w-full rounded-lg border border-orange-200 bg-orange-50 p-2 text-sm text-orange-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                rows={2}
              />
            )}
          </div>

          {annulled && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
              Redação anulada. A nota final será 0 e o espelho completo ficará oculto para o aluno.
            </div>
          )}

          {!annulled && type === 'PAS' && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-slate-800">Espelho PAS/UnB</h3>
                <p className="text-xs text-slate-500">NR = NC − 2 × (NE / TL)</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Quesitos avaliados</th>
                      <th className="px-3 py-2 text-left font-medium">Faixa de valor</th>
                      <th className="px-3 py-2 text-left font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {macroRows.map((row) =>
                      row.type === 'group' ? (
                        <tr key={row.id} className="bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-600">{`${row.id}. ${row.label}`}</td>
                          <td className="px-3 py-2 text-slate-400" colSpan={2}>
                            —
                          </td>
                        </tr>
                      ) : (
                        <tr key={row.id}>
                          <td className="px-3 py-2">
                            <span className="mr-1 font-semibold text-slate-800">{row.id}</span>
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{row.range}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={row.max}
                              step={row.step}
                              value={pasState[row.key]}
                              onInput={handlePasFieldChange(row.key)}
                              className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                            />
                          </td>
                        </tr>
                      )
                    )}
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-800">Nota de conteúdo (NC)</td>
                      <td className="px-3 py-2 text-slate-500">0,00 a 10,00</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{formatNumber(pasComputed.nc)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <h4 className="text-sm font-semibold text-slate-800">Aspectos microestruturais</h4>
                  <label className="flex flex-col text-xs font-medium text-slate-600">
                    TL (número total de linhas)
                    <input
                      type="number"
                      min={8}
                      max={30}
                      step={1}
                      value={pasState.TL}
                      onInput={handlePasFieldChange('TL')}
                      className="mt-1 w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                    />
                  </label>
                  <p className="text-xs text-slate-600">
                    Desconto por erro: <strong>{pasComputed.discount != null ? pasComputed.discount.toFixed(3) : '—'}</strong>
                  </p>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-xs text-slate-700">
                      <thead className="bg-white text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Tipo de erro</th>
                          <th className="px-3 py-2 text-left font-medium">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {errorRows.map((row) => (
                          <tr key={row.key}>
                            <td className="px-3 py-2">{row.label}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={pasState.erros[row.key]}
                                onInput={handlePasFieldChange(`erros.${row.key}` as PasFieldKey)}
                                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <h4 className="text-sm font-semibold text-slate-800">Resumo calculado</h4>
                  <div className="space-y-2">
                    <p className="flex items-center justify-between">
                      <span>NC</span>
                      <span className="font-semibold text-slate-900">{formatNumber(pasComputed.nc)}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>TL</span>
                      <span className="font-semibold text-slate-900">{pasComputed.tl ?? '—'}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>NE total</span>
                      <span className="font-semibold text-slate-900">{pasComputed.ne}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Desconto por erro</span>
                      <span className="font-semibold text-slate-900">
                        {pasComputed.discount != null ? pasComputed.discount.toFixed(3) : '—'}
                      </span>
                    </p>
                    <p className="flex items-center justify-between text-base font-semibold text-orange-600">
                      <span>NR previsto</span>
                      <span>{formattedPasResult}</span>
                    </p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Distribuição de erros</p>
                    <div className="space-y-1">
                      {errorRows.map((row) => (
                        <p key={row.key} className="flex items-center justify-between text-xs">
                          <span>{row.label}</span>
                          <span className="font-semibold text-slate-900">{pasComputed.errors[row.key]}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Valores são sincronizados automaticamente com o PDF corrigido após salvar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!annulled && type === 'ENEM' && (
            <EnemScoringForm selections={enemSelections} onChange={onEnemSelectionChange} />
          )}
        </div>

        <div className="flex h-full flex-col gap-4">
          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-orange-50/40 p-5 text-sm text-orange-700 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-orange-500">Resumo do espelho</p>
            <p className="mt-1 text-3xl font-bold text-orange-600">
              {annulled ? '0' : type === 'PAS' ? formattedPasResult : enemTotal}
              {!annulled && type === 'ENEM' ? <span className="ml-1 text-sm text-orange-500">/ 1000</span> : null}
            </p>
            <p className="mt-2 text-xs text-orange-600">
              Os dados são sincronizados automaticamente com o PDF corrigido após salvar.
            </p>
            {!annulled && type === 'ENEM' && (
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                {ENEM_2024.map((competency) => (
                  <div key={competency.key} className="rounded-xl border border-orange-200/60 bg-white/80 px-3 py-2 shadow-sm">
                    <p className="text-[11px] uppercase tracking-wide text-orange-500">{competency.title}</p>
                    <p className="mt-1 font-semibold text-orange-600">
                      N{enemSelections[competency.key]?.level ?? '-'} •{' '}
                      {levelPoints(competency.key, enemSelections[competency.key]?.level ?? 0)} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
            {!annulled && type === 'PAS' && (
              <div className="mt-3 space-y-3 text-xs">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white bg-white/80 px-3 py-2 shadow-sm">
                    <p className="text-[11px] uppercase tracking-wide text-orange-500">NC</p>
                    <p className="mt-1 font-semibold text-orange-600">{formatNumber(pasComputed.nc)}</p>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-white px-3 py-2 shadow-sm">
                    <p className="text-[11px] uppercase tracking-wide text-orange-500">NR previsto</p>
                    <p className="mt-1 text-lg font-bold text-orange-600">{formattedPasResult}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-orange-500">Aspectos macro</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {macroItemRows.map((row) => (
                      <div key={row.id} className="rounded-lg border border-white bg-white/80 px-3 py-2 shadow-sm">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          {`${row.id}. ${row.label}`}
                        </p>
                        <p className="mt-1 font-semibold text-orange-600">
                          {formatNumber(pasComputed.macros[row.key], 2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-orange-500">Aspectos micro</p>
                  <div className="grid gap-2">
                    <p className="flex items-center justify-between">
                      <span>TL</span>
                      <span className="font-semibold text-orange-600">{pasComputed.tl ?? '—'}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>NE total</span>
                      <span className="font-semibold text-orange-600">{pasComputed.ne}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Desconto por erro</span>
                      <span className="font-semibold text-orange-600">
                        {pasComputed.discount != null ? pasComputed.discount.toFixed(3) : '—'}
                      </span>
                    </p>
                    <div className="space-y-1">
                      {errorRows.map((row) => (
                        <p key={row.key} className="flex items-center justify-between">
                          <span>{row.label}</span>
                          <span className="font-semibold text-orange-600">{pasComputed.errors[row.key]}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-xs text-slate-600 shadow-sm">
            <p className="font-medium text-slate-700">Lembrete rápido</p>
            <p className="mt-1">
              Salve antes de gerar o PDF corrigido. Ajustes de anulação ou notas são aplicados imediatamente ao espelho.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function levelPoints(key: keyof EnemSelectionsMap, level: number) {
  const competency = ENEM_2024.find((comp) => comp.key === key);
  const data = competency?.levels.find((lvl) => lvl.level === level);
  return data?.points ?? 0;
}

export default CorrectionMirror;
