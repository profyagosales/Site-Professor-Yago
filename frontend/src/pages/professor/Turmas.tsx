import { Page } from "@/components/Page";
import { Card, CardBody, CardTitle, CardSub } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listClasses, createClass } from "@/services/classes";
import ClassModal from '@/components/ClassModal';

export default function TurmasPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await listClasses();
        if (!alive) return;
        setTurmas(Array.isArray(data) ? data : data?.items || []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.message || 'Erro ao carregar turmas');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false };
  }, []);

  return (
    <Page title="Turmas" subtitle="Gerencie turmas, alunos e avaliações.">
      <div className="mb-4">
        <Button onClick={() => setIsModalOpen(true)}>Nova Turma</Button>
      </div>

      {err && <p className="text-red-600 mb-4">{err}</p>}
      {loading && <p className="text-ys-ink-2">Carregando turmas…</p>}
      {!loading && (
        <div className="grid sm:grid-cols-2 gap-4">
        {turmas.map((t: any) => (
          <Card key={t.id}>
            <CardBody>
              <CardTitle>{t.name || t.nome || `${t.series || ''} ${t.letter || ''}`}</CardTitle>
              <CardSub>Disciplina: {t.discipline || t.disciplina || '-'}</CardSub>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => nav(`/professor/turmas/${t._id || t.id}/alunos`)}>Ver alunos</Button>
                <Button variant="ghost">Editar</Button>
                <Button variant="ghost">Excluir</Button>
              </div>
            </CardBody>
          </Card>
        ))}
        {turmas.length === 0 && <p className="text-ys-ink-2">Nenhuma turma encontrada.</p>}
      </div>
      )}
  <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (payload: any) => {
          try {
            await createClass(payload);
            setIsModalOpen(false);
            // reload
            setLoading(true);
            const data = await listClasses();
            setTurmas(Array.isArray(data) ? data : data?.items || data?.data || []);
          } catch (e: any) {
            alert(e?.response?.data?.message || 'Erro ao criar turma');
          } finally {
            setLoading(false);
          }
  }}
  initialData={null as any}
      />
    </Page>
  );
}

