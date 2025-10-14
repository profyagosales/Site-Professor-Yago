import { Page } from '@/components/Page';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStudent, getStudentEssays } from '@/services/students2';
// @ts-expect-error serviço legado em JS
import gradesService from '@/services/grades';
// @ts-expect-error serviço legado em JS
import cadernoService from '@/services/caderno';
import NewEssayModal from '@/components/redacao/NewEssayModal';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';

export default function PerfilAluno() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'essays'|'grades'|'notebook'>('essays');
  const [modal, setModal] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const r = await getStudent(id);
      setData(r);
    })();
  }, [id]);

  const student = data?.student;
  const sectionTabs = [
    { key: 'essays', label: 'Redações', isActive: tab === 'essays', onClick: () => setTab('essays') },
    { key: 'grades', label: 'Notas da Classe', isActive: tab === 'grades', onClick: () => setTab('grades') },
    { key: 'notebook', label: 'Caderno', isActive: tab === 'notebook', onClick: () => setTab('notebook') },
  ];

  return (
    <Page title={student?.name || 'Aluno'} subtitle={student?.email || ''}>
      <div className="mb-3">
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[#111827] font-semibold">{student?.name}</div>
              <div className="text-sm text-ys-ink-2">{student?.email}</div>
            </div>
            <Button onClick={() => setModal(true)}>
              Nova Redação
            </Button>
          </div>
        </div>
      </div>

      <Tabs items={sectionTabs} className="mb-3" />

      {tab==='essays' && <ListaRedacoesAluno id={id!} />}
  {tab==='grades' && <NotasAluno id={id!} classId={student?.class} />}
  {tab==='notebook' && <CadernoAluno classId={student?.class} />}

      <NewEssayModal open={modal} onClose={()=> setModal(false)} defaultStudentId={id} defaultClassId={student?.class} onSuccess={()=>{ /* nada aqui, a tela do professor recarrega separadamente */ }} />
    </Page>
  );
}

function NotasAluno({ id, classId }: { id: string; classId?: string }) {
  const [data, setData] = useState<{ bimesters: (number|undefined)[]; average: number } | null>(null);
  const [err, setErr] = useState<string|null>(null);
  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const res = await gradesService.getStudentGrades(id);
        setData(res);
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Erro ao carregar notas');
  toast.error(e?.response?.data?.message || 'Erro ao carregar notas');
      }
    })();
  }, [id]);
  if (err) return <div className="text-red-600">{err}</div>;
  if (!data) return <div className="text-ys-ink-2">Carregando…</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
      <table className="w-full text-sm text-[#111827]">
        <thead className="bg-[#F3F4F6] text-left text-[#374151]"><tr><th className="px-4 py-3">1º Bim</th><th className="px-4 py-3">2º Bim</th><th className="px-4 py-3">3º Bim</th><th className="px-4 py-3">4º Bim</th><th className="px-4 py-3">Média</th></tr></thead>
        <tbody>
          <tr>
            {data.bimesters.map((v, i) => <td key={i} className="px-4 py-3">{v ?? '-'}</td>)}
            <td className="px-4 py-3 font-semibold">{Number(data.average.toFixed(2))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CadernoAluno({ classId }: { classId?: string }) {
  const [term, setTerm] = useState('1');
  const [data, setData] = useState<any[]>([]);
  const [err, setErr] = useState<string|null>(null);
  useEffect(() => {
    (async () => {
      if (!classId) return;
      try {
        setErr(null);
        const res = await cadernoService.getVistos(classId, term);
        const items = Array.isArray(res) ? res : (res?.data || []);
        setData(items);
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Erro ao carregar caderno');
  toast.error(e?.response?.data?.message || 'Erro ao carregar caderno');
      }
    })();
  }, [classId, term]);
  if (!classId) return <div className="text-ys-ink-2">Selecione uma turma.</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
      <div className="p-3 flex items-center gap-2">
        <span className="text-sm">Bimestre:</span>
        <select className="rounded border border-[#E5E7EB] p-1" value={term} onChange={e=> setTerm(e.target.value)}>
          {[1,2,3,4].map(n => <option key={n} value={String(n)}>{n}</option>)}
        </select>
      </div>
      {err && <div className="px-4 py-2 text-red-600">{err}</div>}
      <table className="w-full text-sm text-[#111827]">
        <thead className="bg-[#F3F4F6] text-left text-[#374151]"><tr><th className="px-4 py-3">Título</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Presença</th><th className="px-4 py-3">% Classe</th></tr></thead>
        <tbody>
          {data.map((c:any) => (
            <tr key={c._id} className="odd:bg-[#F9FAFB]">
              <td className="px-4 py-3">{c.title || '-'}</td>
              <td className="px-4 py-3">{c.date ? new Date(c.date).toLocaleDateString() : '-'}</td>
              <td className="px-4 py-3">{c.alunos_feitos}/{c.total_alunos}</td>
              <td className="px-4 py-3">{Math.round(c.percentual)}%</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td className="px-4 py-3 text-ys-ink-2" colSpan={4}>Sem registros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ListaRedacoesAluno({ id }: { id: string }) {
  const [status, setStatus] = useState<'pending'|'corrected'>('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const statusTabs = [
    { key: 'pending', label: 'Pendentes', isActive: status === 'pending', onClick: () => { setStatus('pending'); setPage(1); } },
    { key: 'corrected', label: 'Corrigidas', isActive: status === 'corrected', onClick: () => { setStatus('corrected'); setPage(1); } },
  ];

  useEffect(() => {
    (async () => {
      const r = await getStudentEssays(id, { status, page, pageSize });
      setData(r);
    })();
  }, [id, status, page, pageSize]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
      <Tabs items={statusTabs} className="p-3" />
      <table className="w-full text-sm text-[#111827]">
        <thead className="bg-[#F3F4F6] text-left text-[#374151]"><tr><th className="px-4 py-3">Tema</th><th className="px-4 py-3">Enviado</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Arquivo</th></tr></thead>
        <tbody>
          {data.items.map((e:any) => (
            <tr key={e._id || e.id} className="odd:bg-[#F9FAFB]">
              <td className="px-4 py-3">{e.customTheme || e.theme || '-'}</td>
              <td className="px-4 py-3">{new Date(e.submittedAt || e.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">{e.rawScore ?? e.score ?? '-'}</td>
              <td className="px-4 py-3"><span className="text-muted-foreground/70 select-none" title="Visualização inline">Visualização inline</span></td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td className="px-4 py-3 text-ys-ink-2" colSpan={4}>Sem redações.</td></tr>}
        </tbody>
      </table>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
          <span className="text-sm text-ys-ink-2">Página {page}</span>
          <button className="rounded border border-[#E5E7EB] px-3 py-1 disabled:opacity-50" disabled={(page*pageSize)>=data.total} onClick={()=>setPage(p=>p+1)}>Próxima</button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Tamanho:</span>
          <select className="rounded border border-[#E5E7EB] p-1" value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
            {[10,20,50].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
