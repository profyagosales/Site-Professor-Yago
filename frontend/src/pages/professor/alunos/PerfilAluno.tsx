import { Page } from '@/components/Page';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStudent, getStudentEssays } from '@/services/students2';
import { listStudentGrades, computeTermTotals, computeTermAverages } from '@/services/grades';
import cadernoService from '@/services/caderno';
import NewEssayModal from '@/components/redacao/NewEssayModal';
import { toast } from 'react-toastify';

export default function PerfilAluno() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'essays' | 'grades' | 'notebook'>('essays');
  const [modal, setModal] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const r = await getStudent(id);
      setData(r);
    })();
  }, [id]);

  const student = data?.student;

  return (
    <Page title={student?.name || 'Aluno'} subtitle={student?.email || ''}>
      <div className='mb-3'>
        <div className='overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-[#111827] font-semibold'>
                {student?.name}
              </div>
              <div className='text-sm text-ys-ink-2'>{student?.email}</div>
            </div>
            <button
              className='rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white'
              onClick={() => setModal(true)}
            >
              Nova Redação
            </button>
          </div>
        </div>
      </div>

      <div className='mb-3 flex gap-2'>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${tab === 'essays' ? 'bg-orange-500 text-white' : 'border-[#E5E7EB] text-[#111827]'}`}
          onClick={() => setTab('essays')}
        >
          Redações
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${tab === 'grades' ? 'bg-orange-500 text-white' : 'border-[#E5E7EB] text-[#111827]'}`}
          onClick={() => setTab('grades')}
        >
          Notas da Classe
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm ${tab === 'notebook' ? 'bg-orange-500 text-white' : 'border-[#E5E7EB] text-[#111827]'}`}
          onClick={() => setTab('notebook')}
        >
          Caderno
        </button>
      </div>

      {tab === 'essays' && <ListaRedacoesAluno id={id!} />}
      {tab === 'grades' && <NotasAluno id={id!} classId={student?.class} />}
      {tab === 'notebook' && <CadernoAluno classId={student?.class} />}

      <NewEssayModal
        open={modal}
        onClose={() => setModal(false)}
        defaultStudentId={id}
        defaultClassId={student?.class}
        onSuccess={() => {
          /* nada aqui, a tela do professor recarrega separadamente */
        }}
      />
    </Page>
  );
}

function NotasAluno({ id, classId }: { id: string; classId?: string }) {
  const [data, setData] = useState<{
    grades: Array<{ term: number; average: number; total: number }>;
    yearAverage: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
  useEffect(() => {
    const loadGrades = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setErr(null);
        
        // Carregar notas de todos os bimestres
        const allGrades = await Promise.all([
          listStudentGrades({ studentId: id, term: 1 }).catch(() => null),
          listStudentGrades({ studentId: id, term: 2 }).catch(() => null),
          listStudentGrades({ studentId: id, term: 3 }).catch(() => null),
          listStudentGrades({ studentId: id, term: 4 }).catch(() => null),
        ]);
        
        const processedGrades = allGrades.map((gradeData, index) => ({
          term: index + 1,
          average: gradeData?.averageScore || 0,
          total: gradeData?.totalScore || 0,
        }));
        
        const yearAverage = processedGrades.reduce((sum, grade) => sum + grade.average, 0) / 4;
        
        setData({
          grades: processedGrades,
          yearAverage,
        });
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Erro ao carregar notas');
        toast.error(e?.response?.data?.message || 'Erro ao carregar notas');
      } finally {
        setLoading(false);
      }
    };
    
    loadGrades();
  }, [id]);
  
  if (err) return <div className='text-red-600'>{err}</div>;
  if (loading) return <div className='text-ys-ink-2'>Carregando notas…</div>;
  if (!data) return <div className='text-ys-ink-2'>Sem dados de notas</div>;
  
  return (
    <div className='overflow-hidden rounded-xl border border-[#E5E7EB] bg-white'>
      <table className='w-full text-sm text-[#111827]'>
        <thead className='bg-[#F3F4F6] text-left text-[#374151]'>
          <tr>
            <th className='px-4 py-3'>1º Bim</th>
            <th className='px-4 py-3'>2º Bim</th>
            <th className='px-4 py-3'>3º Bim</th>
            <th className='px-4 py-3'>4º Bim</th>
            <th className='px-4 py-3'>Média Anual</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {data.grades.map((grade) => (
              <td key={grade.term} className='px-4 py-3'>
                {grade.average > 0 ? grade.average.toFixed(1) : '-'}
              </td>
            ))}
            <td className='px-4 py-3 font-semibold'>
              {data.yearAverage.toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
      
      {/* Detalhes adicionais */}
      <div className='px-4 py-3 bg-gray-50 border-t'>
        <h4 className='text-sm font-medium text-gray-700 mb-2'>Detalhes por Bimestre:</h4>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-2 text-xs'>
          {data.grades.map((grade) => (
            <div key={grade.term} className='text-center'>
              <div className='font-medium'>{grade.term}º Bim</div>
              <div>Média: {grade.average.toFixed(1)}</div>
              <div>Total: {grade.total.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CadernoAluno({ classId }: { classId?: string }) {
  const [term, setTerm] = useState('1');
  const [data, setData] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!classId) return;
      try {
        setErr(null);
        const res = await cadernoService.getVistos(classId, term);
        const items = Array.isArray(res) ? res : res?.data || [];
        setData(items);
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Erro ao carregar caderno');
        toast.error(e?.response?.data?.message || 'Erro ao carregar caderno');
      }
    })();
  }, [classId, term]);
  if (!classId)
    return <div className='text-ys-ink-2'>Selecione uma turma.</div>;
  return (
    <div className='overflow-hidden rounded-xl border border-[#E5E7EB] bg-white'>
      <div className='p-3 flex items-center gap-2'>
        <span className='text-sm'>Bimestre:</span>
        <select
          className='rounded border border-[#E5E7EB] p-1'
          value={term}
          onChange={e => setTerm(e.target.value)}
        >
          {[1, 2, 3, 4].map(n => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {err && <div className='px-4 py-2 text-red-600'>{err}</div>}
      <table className='w-full text-sm text-[#111827]'>
        <thead className='bg-[#F3F4F6] text-left text-[#374151]'>
          <tr>
            <th className='px-4 py-3'>Título</th>
            <th className='px-4 py-3'>Data</th>
            <th className='px-4 py-3'>Presença</th>
            <th className='px-4 py-3'>% Classe</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c: any) => (
            <tr key={c._id} className='odd:bg-[#F9FAFB]'>
              <td className='px-4 py-3'>{c.title || '-'}</td>
              <td className='px-4 py-3'>
                {c.date ? new Date(c.date).toLocaleDateString() : '-'}
              </td>
              <td className='px-4 py-3'>
                {c.alunos_feitos}/{c.total_alunos}
              </td>
              <td className='px-4 py-3'>{Math.round(c.percentual)}%</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td className='px-4 py-3 text-ys-ink-2' colSpan={4}>
                Sem registros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ListaRedacoesAluno({ id }: { id: string }) {
  const [status, setStatus] = useState<'pending' | 'corrected'>('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<any>({ items: [], total: 0 });

  useEffect(() => {
    (async () => {
      const r = await getStudentEssays(id, { status, page, pageSize });
      setData(r);
    })();
  }, [id, status, page, pageSize]);

  return (
    <div className='overflow-hidden rounded-xl border border-[#E5E7EB] bg-white'>
      <div className='p-3 flex items-center gap-2'>
        <button
          className={`rounded-full border px-3 py-1 text-sm ${status === 'pending' ? 'bg-orange-500 text-white' : 'border-[#E5E7EB] text-[#111827]'}`}
          onClick={() => {
            setStatus('pending');
            setPage(1);
          }}
        >
          Pendentes
        </button>
        <button
          className={`rounded-full border px-3 py-1 text-sm ${status === 'corrected' ? 'bg-orange-500 text-white' : 'border-[#E5E7EB] text-[#111827]'}`}
          onClick={() => {
            setStatus('corrected');
            setPage(1);
          }}
        >
          Corrigidas
        </button>
      </div>
      <table className='w-full text-sm text-[#111827]'>
        <thead className='bg-[#F3F4F6] text-left text-[#374151]'>
          <tr>
            <th className='px-4 py-3'>Tema</th>
            <th className='px-4 py-3'>Enviado</th>
            <th className='px-4 py-3'>Nota</th>
            <th className='px-4 py-3'>Arquivo</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((e: any) => (
            <tr key={e._id || e.id} className='odd:bg-[#F9FAFB]'>
              <td className='px-4 py-3'>{e.customTheme || e.theme || '-'}</td>
              <td className='px-4 py-3'>
                {new Date(e.submittedAt || e.createdAt).toLocaleDateString()}
              </td>
              <td className='px-4 py-3'>{e.rawScore ?? e.score ?? '-'}</td>
              <td className='px-4 py-3'>
                <a
                  className='text-orange-600 underline'
                  href={e.originalUrl || e.fileUrl}
                  target='_blank'
                  rel='noreferrer'
                >
                  Abrir
                </a>
              </td>
            </tr>
          ))}
          {data.items.length === 0 && (
            <tr>
              <td className='px-4 py-3 text-ys-ink-2' colSpan={4}>
                Sem redações.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className='p-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <button
            className='rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50'
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className='text-sm text-ys-ink-2'>Página {page}</span>
          <button
            className='rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50'
            disabled={page * pageSize >= data.total}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima
          </button>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span>Tamanho:</span>
          <select
            className='rounded border border-[#E5E7EB] p-1'
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
