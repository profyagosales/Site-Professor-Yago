import type { FormEvent } from 'react';
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

type PasState = {
  NC: string;
  NL: string;
  NE: string;
};

type CorrectionMirrorProps = {
  type: 'PAS' | 'ENEM' | null | undefined;
  annulState: Record<string, boolean>;
  annulOther: string;
  onToggleAnnul: (key: string, checked: boolean) => void;
  onAnnulOtherChange: (value: string) => void;
  annulled: boolean;
  pasState: PasState;
  onPasChange: (field: keyof PasState, value: string) => void;
  pasResult: number;
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
  pasResult,
  enemSelections,
  onEnemSelectionChange,
  enemTotal,
}: CorrectionMirrorProps) {
  const handlePasInput = (field: keyof PasState) => (event: FormEvent<HTMLInputElement>) => {
    onPasChange(field, event.currentTarget.value);
  };

  const previewScore = annulled ? 0 : type === 'PAS' ? pasResult : type === 'ENEM' ? enemTotal : 0;
  const previewLabel = annulled ? 'Redação anulada' : type === 'PAS' ? 'NR prevista' : 'Total ENEM';
  const formattedPasResult = pasResult.toFixed(2);
  const formattedPreviewScore = type === 'PAS' ? formattedPasResult : previewScore.toString();

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Espelho de correção</h2>
          <p className="text-sm text-slate-600">
            Ajuste os detalhes abaixo para gerar o espelho final compartilhado com o aluno.
          </p>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 text-right shadow-sm ${
            annulled ? 'border-red-200 bg-red-50 text-red-600' : 'border-orange-200 bg-orange-50 text-orange-600'
          }`}
        >
          <p className="text-xs uppercase tracking-wide">{previewLabel}</p>
          <p className="text-xl font-semibold text-slate-900">
            {annulled ? '0' : formattedPreviewScore}
            {!annulled && type === 'ENEM' ? <span className="ml-1 text-sm text-slate-500">/ 1000</span> : null}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
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
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">Espelho PAS/UnB</h3>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-600">Fórmula NR</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col text-sm text-slate-700">
                  NC (0 a 10)
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={pasState.NC}
                    onInput={handlePasInput('NC')}
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                  />
                </label>
                <label className="flex flex-col text-sm text-slate-700">
                  NL (8 a 30)
                  <input
                    type="number"
                    min={8}
                    max={30}
                    step={1}
                    value={pasState.NL}
                    onInput={handlePasInput('NL')}
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                  />
                </label>
                <label className="flex flex-col text-sm text-slate-700">
                  NE (erros)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={pasState.NE}
                    onInput={handlePasInput('NE')}
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                  />
                </label>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>
                  NR = NC - 2 × (NE / NL) ➜ <strong>{formattedPasResult}</strong>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  A nota final é limitada ao mínimo 0. Atualize os campos para recalcular automaticamente.
                </p>
                <dl className="mt-3 grid gap-3 text-xs text-slate-600 md:grid-cols-2">
                  <div className="space-y-1 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">NC</dt>
                    <dd className="text-sm font-medium text-slate-700">{pasState.NC || '—'}</dd>
                  </div>
                  <div className="space-y-1 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">NL</dt>
                    <dd className="text-sm font-medium text-slate-700">{pasState.NL || '—'}</dd>
                  </div>
                  <div className="space-y-1 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">NE</dt>
                    <dd className="text-sm font-medium text-slate-700">{pasState.NE || '—'}</dd>
                  </div>
                  <div className="space-y-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 shadow-sm">
                    <dt className="text-[11px] uppercase tracking-wide text-orange-600">NR</dt>
                    <dd className="text-sm font-semibold text-orange-700">{formattedPasResult}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {!annulled && type === 'ENEM' && (
            <EnemScoringForm selections={enemSelections} onChange={onEnemSelectionChange} />
          )}
        </div>

        <div className="flex h-full flex-col justify-between gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-800">Dicas rápidas</h4>
            <ul className="mt-2 space-y-2 text-xs text-slate-600">
              <li>• Use os motivos de anulação para orientar a devolutiva ao aluno.</li>
              <li>• No modelo PAS/UnB, valide o número de linhas antes de atribuir NE.</li>
              <li>• No modelo ENEM, siga a rubrica oficial ao selecionar nível e justificativas.</li>
            </ul>
          </div>
          {!annulled && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700 shadow-sm">
              <p className="font-semibold">Resumo da nota</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">
                {type === 'PAS' ? formattedPasResult : enemTotal}
                {type === 'ENEM' ? <span className="ml-1 text-sm text-orange-500">/ 1000</span> : null}
              </p>
              <p className="mt-1 text-xs text-orange-600">
                Os dados do espelho são sincronizados automaticamente com a geração do PDF corrigido.
              </p>
              {type === 'ENEM' && (
                <p className="mt-1 text-xs text-orange-600">
                  Nível base de cada competência: {ENEM_2024.map((c) => selectionsSummary(enemSelections, c.key)).join(' • ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function selectionsSummary(selections: EnemSelectionsMap, key: keyof EnemSelectionsMap) {
  const selection = selections[key];
  return `${key}: N${selection?.level ?? '-'} (${selection?.level != null ? levelPoints(key, selection.level) : 0} pts)`;
}

function levelPoints(key: keyof EnemSelectionsMap, level: number) {
  const competency = ENEM_2024.find((comp) => comp.key === key);
  const data = competency?.levels.find((lvl) => lvl.level === level);
  return data?.points ?? 0;
}

export default CorrectionMirror;
