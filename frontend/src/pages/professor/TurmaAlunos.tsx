import { Page } from '@/components/Page';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td } from '@/components/ui/Table';
import { useEffect, useState } from 'react';
import EditStudentModal from '@/components/EditStudentModal';
import { useParams, Link } from 'react-router-dom';
import {
  listStudents as listStudentsApi,
  create as createStudent,
  update as updateStudent,
  remove as removeStudent,
} from '@/services/students';
import { getClassById } from '@/services/classes';
import NewStudentModal from '@/components/NewStudentModal';
import { ROUTES } from '@/routes';

export default function TurmaAlunosPage() {
  const { id: classId } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [classeInfo, setClasseInfo] = useState<any | null>(null);

  async function load() {
    if (!classId) return;
    try {
      setLoading(true);
      setErr(null);
      const res = await listStudentsApi(classId);
      setAlunos(
        Array.isArray(res?.data) ? res.data : res?.data?.data || res || []
      );
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [classId]);
  useEffect(() => {
    (async () => {
      if (!classId) return;
      try {
        setClasseInfo(await getClassById(classId));
      } catch {}
    })();
  }, [classId]);

  const titulo = classeInfo
    ? `${classeInfo.series || ''}º ${classeInfo.letter || ''} — ${classeInfo.discipline || ''}`.trim()
    : 'Turma';
  return (
    <Page title={titulo} subtitle='Alunos cadastrados'>
      <div className='mb-4'>
        <div className='mb-2 flex items-center justify-between'>
          <Link
            to={ROUTES.prof.turmas}
            className='text-sm text-ys-ink-2 hover:text-ys-ink'
          >
            ← Voltar para Turmas
          </Link>
        </div>
        <Button disabled={!classId} onClick={() => setModalOpen(true)}>
          Novo Aluno
        </Button>
      </div>

      {err && <p className='text-red-600 mb-2'>{err}</p>}
      {loading ? (
        <p>Carregando alunos…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Aluno</Th>
              <Th>E-mail</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((a: any) => (
              <tr key={a._id || a.id}>
                <Td>
                  <div className='flex items-center gap-3'>
                    {a.photo && (
                      <img
                        src={
                          /^data:/.test(a.photo)
                            ? a.photo
                            : `data:image/jpeg;base64,${a.photo}`
                        }
                        alt={a.name || a.nome}
                        className='h-10 w-10 rounded-full object-cover'
                      />
                    )}
                    <span>{a.name || a.nome}</span>
                  </div>
                </Td>
                <Td>{a.email || '-'}</Td>
                <Td>
                  <div className='flex gap-2'>
                    <Button
                      variant='ghost'
                      onClick={async () => {
                        setSelectedStudent(a);
                        setIsEditOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant='ghost'
                      onClick={async () => {
                        if (!confirm('Remover aluno?')) return;
                        try {
                          await removeStudent(classId!, a._id || a.id);
                          await load();
                        } catch (e: any) {
                          alert(
                            e?.response?.data?.message ||
                              'Erro ao remover aluno'
                          );
                        }
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <NewStudentModal
        classId={classId!}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={async () => {
          await load();
        }}
      />
      <EditStudentModal
        classId={classId!}
        student={selectedStudent}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedStudent(null);
        }}
        onUpdated={load}
      />
    </Page>
  );
}
