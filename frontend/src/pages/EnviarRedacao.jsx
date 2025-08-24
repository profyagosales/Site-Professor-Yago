import { useEffect, useState, useRef } from 'react';
import { getStudentProfile } from '@/services/student';
import { listThemes, uploadEssay, listEssays } from '@/services/essays';
import { toast } from 'react-toastify';

function EnviarRedacao() {
  const [student, setStudent] = useState(null);
  const [type, setType] = useState('ENEM');
  const [themes, setThemes] = useState([]);
  const [themeId, setThemeId] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [bimestre, setBimestre] = useState('');
  const [file, setFile] = useState(null);
  const [essays, setEssays] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const me = await getStudentProfile();
        setStudent(me.user || me);
      } catch (err) {
        console.error('Erro ao carregar aluno', err);
      }
    };
    loadStudent();
  }, []);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const data = await listThemes({ type });
        setThemes(data.data || data);
      } catch (err) {
        console.error('Erro ao carregar temas', err);
      }
    };
    loadThemes();
  }, [type]);

  useEffect(() => {
    const loadEssays = async () => {
      try {
        const data = await listEssays();
        setEssays(data.data || data);
      } catch (err) {
        console.error('Erro ao carregar redações', err);
      }
    };
    loadEssays();
  }, []);

  const resetForm = () => {
    setType('ENEM');
    setThemeId('');
    setCustomTheme('');
    setBimestre('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 15MB');
      return;
    }
    if (!bimestre) {
      toast.error('Selecione o bimestre');
      return;
    }
    if (themeId !== 'custom' && !themeId) {
      toast.error('Selecione o tema');
      return;
    }
    if (themeId === 'custom' && !customTheme.trim()) {
      toast.error('Informe o tema');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('bimester', bimestre);
      if (themeId === 'custom') formData.append('customTheme', customTheme);
      else formData.append('themeId', themeId);
      formData.append('file', file);
      await uploadEssay(formData);
      toast.success('Redação enviada');
      resetForm();
      const data = await listEssays();
      setEssays(data.data || data);
    } catch (err) {
      console.error('Erro ao enviar redação', err);
      const message = err.response?.data?.message || 'Erro ao enviar redação';
      toast.error(message);
    }
  };

  return (
    <div className="pt-20 p-md space-y-md">
      {student && (
        <div className="ys-card flex items-center gap-md p-md">
          <img
            src={student.photo}
            alt={student.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold">{student.name}</p>
            <p className="text-sm text-black/70">{student.className || ''}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ys-card p-md space-y-md">
        <div className="space-y-sm">
          <label className="block font-medium">Tipo</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setThemeId('');
            }}
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
            {themes.map((t) => (
              <option key={t._id || t.id} value={t._id || t.id}>
                {t.name}
              </option>
            ))}
            <option value="custom">Tema não está na lista</option>
          </select>
          {themeId === 'custom' && (
            <input
              type="text"
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              placeholder="Digite o tema"
              className="border p-sm rounded w-full"
            />
          )}
        </div>

        <div className="space-y-sm">
          <label className="block font-medium">Bimestre</label>
          <select
            value={bimestre}
            onChange={(e) => setBimestre(e.target.value)}
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
          <label className="block font-medium">Arquivo (PDF ou imagem)</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files[0])}
            ref={fileInputRef}
          />
        </div>

        <button type="submit" className="ys-btn-primary">
          Enviar
        </button>
      </form>

      <div className="space-y-sm">
        <h2 className="text-xl font-semibold">Minhas redações</h2>
        {essays.length === 0 && <p className="text-black/60">Nenhuma redação enviada</p>}
        {essays.map((e) => (
          <div key={e._id || e.id} className="ys-card p-md flex justify-between items-center">
            <div>
              <p className="font-medium">{e.customTheme || e.theme?.name || 'Tema'}</p>
              <p className="text-sm text-black/70">Bimestre: {e.bimester}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{e.status === 'GRADED' ? `Nota: ${e.scaledScore}` : 'Pendente'}</p>
              {e.status === 'GRADED' && e.correctedUrl && (
                <a
                  href={e.correctedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange text-sm"
                >
                  Ver correção
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EnviarRedacao;
