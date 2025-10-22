import type { FormEvent } from 'react';

export const ANNUL_OPTIONS = [
  { key: 'MENOS_7_LINHAS', label: 'Menos de 7 linhas' },
  { key: 'FUGA_TEMA', label: 'Fuga ao tema' },
  { key: 'COPIA', label: 'Cópia' },
  { key: 'ILEGIVEL', label: 'Ilegível' },
  { key: 'FUGA_GENERO', label: 'Fuga ao gênero' },
  { key: 'OUTROS', label: 'Outros (especificar)', hasInput: true },
] as const;

const ENEM_LEVEL_POINTS = [0, 40, 80, 120, 160, 200] as const;

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
  enemLevels: number[];
  onEnemLevelChange: (index: number, level: number) => void;
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
  enemLevels,
  onEnemLevelChange,
  enemTotal,
}: CorrectionMirrorProps) {
  const handlePasInput = (field: keyof PasState) => (event: FormEvent<HTMLInputElement>) => {
    onPasChange(field, event.currentTarget.value);
  };

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Espelho de correção</h2>
      <p className="mt-1 text-sm text-slate-600">
        Preencha as informações abaixo para gerar a nota final e o espelho do aluno.
      </p>
      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Anular redação</h3>
        <div className="grid gap-2 md:grid-cols-3">
          {ANNUL_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
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
            className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            rows={2}
          />
        )}
      </div>

      {annulled && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Redação anulada. Nota final será 0 e o espelho não será exibido ao aluno.
        </div>
      )}

      {!annulled && type === 'PAS' && (
        <div className="mt-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-800">Espelho PAS/UnB</h3>
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
                className="mt-1 rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-orange-400"
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
                className="mt-1 rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-orange-400"
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
                className="mt-1 rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <p>
              NR = NC - 2 × (NE / NL) ➜ <strong>{pasResult.toFixed(2)}</strong>
            </p>
            <p className="text-xs text-slate-500">
              A nota final é limitada ao mínimo 0. Atualize os campos para recalcular automaticamente.
            </p>
            <dl className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div className="flex gap-1">
                <dt className="font-medium text-slate-700">NC:</dt>
                <dd>{pasState.NC || '—'}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium text-slate-700">NL:</dt>
                <dd>{pasState.NL || '—'}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium text-slate-700">NE:</dt>
                <dd>{pasState.NE || '—'}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-medium text-slate-700">NR:</dt>
                <dd>{pasResult.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {!annulled && type === 'ENEM' && (
        <div className="mt-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-800">Espelho ENEM</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Competência</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Nível (0-5)</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Pontuação</th>
                </tr>
              </thead>
              <tbody>
                {enemLevels.map((level, index) => (
                  <tr key={index} className="odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-3">Competência {index + 1}</td>
                    <td className="px-4 py-3">
                      <select
                        value={level}
                        onChange={(event) => onEnemLevelChange(index, Number(event.target.value))}
                        className="rounded-md border border-slate-300 p-2 outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        {ENEM_LEVEL_POINTS.map((_, lvl) => (
                          <option key={`level-${lvl}`} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {ENEM_LEVEL_POINTS[level] ?? 0} pts
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-base font-semibold text-slate-900">
                    {enemTotal} pts
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Cada nível equivale a {ENEM_LEVEL_POINTS.slice(1, 2)[0]} pontos adicionais. A nota máxima é 1000 pontos.
          </p>
        </div>
      )}
    </section>
  );
}

export default CorrectionMirror;
