import { useEffect, useState } from 'react';
import { exportGradesPdf, getGradesTable, GradesTableResponse } from '@/services/gradesTable';

type NotasTabelaProps = {
  classId: string;
};

const BIMESTERS = [1, 2, 3, 4];

export function NotasTabela({ classId }: NotasTabelaProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [bimesters, setBimesters] = useState<number[]>([1]);
  const [table, setTable] = useState<GradesTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTable = async (params?: { year?: number; bimesters?: number[] }) => {
    const y = params?.year ?? year;
    const bs = params?.bimesters ?? bimesters;
    setLoading(true);
    setError(null);
    try {
      const data = await getGradesTable({ classId, year: y, bimesters: bs });
      setTable(data);
    } catch (err) {
      console.error('Erro ao carregar tabela de notas', err);
      setError('Não foi possível carregar a tabela de notas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const toggleBimester = (value: number) => {
    setBimesters((prev) => {
      const next = prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value];
      return next.length ? next.sort((a, b) => a - b) : prev;
    });
  };

  useEffect(() => {
    fetchTable({ year, bimesters });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, bimesters.join(',')]);

  const handleExport = () => {
    exportGradesPdf({ classId, year, bimesters });
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tabela de notas</h2>
          <p className="text-sm text-slate-500">Visualize os totais por atividade ou bimestre e exporte em PDF.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-600">
            Ano
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value) || currentYear)}
              className="ml-2 w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {BIMESTERS.map((bimester) => {
              const active = bimesters.includes(bimester);
              return (
                <button
                  key={bimester}
                  type="button"
                  onClick={() => toggleBimester(bimester)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {bimester}º
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Exportar PDF
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Carregando tabela…</p>}

      {!loading && table && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Aluno</th>
                {table.columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left font-semibold text-slate-600">
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {table.rows.map((row) => (
                <tr key={row.studentId}>
                  <td className="px-4 py-3 text-slate-700">{row.studentName}</td>
                  {table.columns.map((column) => (
                    <td key={`${row.studentId}-${column.key}`} className="px-4 py-3 text-slate-600">
                      {(row.values[column.key] ?? 0).toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default NotasTabela;
