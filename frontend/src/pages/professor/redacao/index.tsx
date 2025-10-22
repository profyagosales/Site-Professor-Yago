import { useEffect, useRef, useState } from 'react';
import { listThemes, createTheme, listSubmissionsByTeacher, createSubmission } from '@/services/redaction';
import { listClasses } from '@/services/classes';
import studentsService from '@/services/students';
import { toast } from 'react-toastify';

interface Theme {
  id?: string;
  _id?: string;
  name: string;
}

interface Student {
  _id?: string;
  id?: string;
  name: string;
  class?: string;
  classId?: string;
}

interface Submission {
  id?: string;
  _id?: string;
  studentId: string;
  classId: string;
  model: 'ENEM' | 'PAS';
  themeId?: string;
  themeText?: string;
  bimester: number;
  weightOnBimester: number;
  status?: string;
  createdAt?: string;
  fileUrl?: string | null;
  originalUrl?: string | null;
  correctedUrl?: string | null;
  correctionPdfUrl?: string | null;
  correctedPdfUrl?: string | null;
}

function RedacaoPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [model, setModel] = useState<'ENEM' | 'PAS'>('ENEM');
  const [themeId, setThemeId] = useState('');
  const [themeText, setThemeText] = useState('');
  const [bimester, setBimester] = useState('');
  const [weight, setWeight] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const data = await listThemes();
        setThemes((data as any).data || (data as any));
      } catch (err) {
        console.error('Erro ao carregar temas', err);
      }
    };
    loadThemes();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const clsResp = await listClasses();
        const clsArr: any[] = (clsResp as any).data || (clsResp as any) || [];
        const allStudents: Student[] = [];
        for (const c of clsArr) {
          try {
            const res = await studentsService.list(c._id || c.id);
            const stuArr: any[] = (res as any).data || (res as any) || [];
            stuArr.forEach((s) => {
              allStudents.push({ ...s, classId: c._id || c.id });
            });
          } catch (err) {
            console.error('Erro ao carregar alunos', err);
          }
        }
        setStudents(allStudents);
      } catch (err) {
        console.error('Erro ao carregar turmas', err);
      }
    };
    loadStudents();
  }, []);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        const res = await listSubmissionsByTeacher();
        const arr: Submission[] = (res as any).data || (res as any) || [];
        setSubmissions(arr.slice(0, 20));
      } catch (err) {
        console.error('Erro ao carregar redações', err);
      }
    };
    loadSubmissions();
  }, []);

  const resetForm = () => {
    setStudentId('');
    setClassId('');
    setModel('ENEM');
    setThemeId('');
    setThemeText('');
    setBimester('');
    setWeight('1');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !classId) {
      toast.error('Selecione um aluno');
      return;
    }
    if (!bimester) {
      toast.error('Selecione o bimestre');
      return;
    }
    if (!file) {
      toast.error('Selecione um PDF');
      return;
    }
    const fd = new FormData();
    fd.append('studentId', studentId);
    fd.append('classId', classId);
    fd.append('model', model);
    fd.append('bimester', bimester);
    fd.append('weightOnBimester', weight);
    if (themeId === 'custom') fd.append('themeText', themeText);
    else if (themeId) fd.append('themeId', themeId);
    fd.append('status', 'uploaded');
    fd.append('file', file);
    try {
      await createSubmission(fd);
      toast.success('Redação enviada');
      resetForm();
      const res = await listSubmissionsByTeacher();
      const arr: Submission[] = (res as any).data || (res as any) || [];
      setSubmissions(arr.slice(0, 20));
    } catch (err) {
      console.error('Erro ao enviar', err);
      toast.error('Erro ao enviar');
    }
  };

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;
    try {
      await createTheme({ name: newThemeName });
      toast.success('Tema criado');
      setShowThemeModal(false);
      setNewThemeName('');
      const data = await listThemes();
      setThemes((data as any).data || (data as any));
    } catch (err) {
      console.error('Erro ao criar tema', err);
      toast.error('Erro ao criar tema');
    }
  };

  const statusClass = (status?: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-yellow-200 text-yellow-800';
      case 'graded':
        return 'bg-green-200 text-green-800';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  const studentOptions = students.map((s) => (
    <option key={s._id || s.id} value={`${s._id || s.id}|${s.classId}`}>
      {s.name}
    </option>
  ));

  const themeOptions = themes.map((t) => (
    <option key={t._id || t.id} value={t._id || t.id}>
      {t.name}
    </option>
  ));

  return (
    <div className="pt-20 p-md space-y-md">
      <div className="grid md:grid-cols-2 gap-md">
        <div className="ys-card space-y-md">
          <h2>Cadastrar tema</h2>
          <button className="ys-btn-primary" onClick={() => setShowThemeModal(true)}>
            Novo tema
          </button>
        </div>

        <form className="ys-card space-y-md" onSubmit={handleSubmit}>
          <h2>Enviar redação</h2>
          <div className="space-y-sm">
            <label className="block font-medium">Aluno</label>
            <select
              value={studentId && classId ? `${studentId}|${classId}` : ''}
              onChange={(e) => {
                const [sid, cid] = e.target.value.split('|');
                setStudentId(sid);
                setClassId(cid);
              }}
              className="border p-sm rounded w-full"
            >
              <option value="">Selecione</option>
              {studentOptions}
            </select>
          </div>

          <div className="space-y-sm">
            <label className="block font-medium">Modelo</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
              className="border p-sm rounded w-full"
            >
              <option value="ENEM">ENEM</option>
              <option value="PAS">PAS</option>
            </select>
          </div>

          <div className="space-y-sm">
            <label className="block font-medium">Tema</label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="border p-sm rounded w-full"
            >
              <option value="">Selecione</option>
              {themeOptions}
              <option value="custom">Tema não está na lista</option>
            </select>
            {themeId === 'custom' && (
              <input
                type="text"
                value={themeText}
                onChange={(e) => setThemeText(e.target.value)}
                placeholder="Digite o tema"
                className="border p-sm rounded w-full"
              />
            )}
          </div>

          <div className="space-y-sm">
            <label className="block font-medium">Bimestre</label>
            <select
              value={bimester}
              onChange={(e) => setBimester(e.target.value)}
              className="border p-sm rounded w-full"
            >
              <option value="">Selecione</option>
              <option value="1">1º</option>
              <option value="2">2º</option>
              <option value="3">3º</option>
              <option value="4">4º</option>
            </select>
          </div>

          <div className="space-y-sm">
            <label className="block font-medium">Peso no bimestre</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="border p-sm rounded w-full"
            />
          </div>

          <div className="space-y-sm">
            <label className="block font-medium">Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              ref={fileRef}
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="border p-sm rounded w-full"
            />
          </div>

          <button type="submit" className="ys-btn-primary">
            Enviar
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-sm">Minhas redações</h2>
        <div className="space-y-sm">
          {submissions.map((s) => {
            const student = students.find((st) => (st._id || st.id) === s.studentId);
            const theme =
              s.themeText ||
              themes.find((t) => (t._id || t.id) === s.themeId)?.name ||
              '';
            const correctedLink =
              s.correctedUrl ||
              s.correctedPdfUrl ||
              s.correctionPdfUrl ||
              (typeof (s as any)?.correctionPdf === 'string' ? (s as any).correctionPdf : null);
            const originalLink = s.originalUrl || s.fileUrl || null;
            return (
              <div
                key={s._id || s.id}
                className="ys-card flex flex-col gap-sm p-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold">{student?.name || s.studentId}</p>
                  <p className="text-sm text-black/70">{theme}</p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end sm:text-right">
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs ${statusClass(s.status)}`}
                  >
                    {s.status || '—'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {originalLink && (
                      <a
                        href={originalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ys-btn-ghost text-xs"
                      >
                        Ver original
                      </a>
                    )}
                    {correctedLink && (
                      <a
                        href={correctedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ys-btn-primary text-xs"
                      >
                        Ver corrigida
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showThemeModal && (
        <div
          role="dialog"
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
        >
          <div className="bg-white p-md space-y-md rounded">
            <h3>Cadastrar tema</h3>
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Nome do tema"
              className="border p-sm rounded w-full"
            />
            <div className="flex justify-end gap-sm">
              <button
                className="ys-btn-ghost"
                onClick={() => setShowThemeModal(false)}
              >
                Cancelar
              </button>
              <button className="ys-btn-primary" onClick={handleCreateTheme}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RedacaoPage;
