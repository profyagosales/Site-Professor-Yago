import { useEffect, useState } from 'react';
import api from '@api';
import { createGabarito } from '@/services/gabaritos';
import { toast } from 'react-toastify';

function CriarGabarito() {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({
    logoLeft: null,
    logoRight: null,
    schoolName: '',
    discipline: '',
    teacher: '',
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await api.get('/classes');
        const list = Array.isArray(res?.data?.data || res?.data)
          ? (res.data.data || res.data)
          : [];
        setClasses(list);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Erro ao carregar turmas');
      }
    };
    loadClasses();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setForm((f) => ({ ...f, [name]: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('logoLeft', form.logoLeft);
      fd.append('logoRight', form.logoRight);
      fd.append('schoolName', form.schoolName);
      fd.append('discipline', form.discipline);
      fd.append('teacher', form.teacher);
      const pdfData = await createGabarito(fd);
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      setPreviewUrl(URL.createObjectURL(blob));
      toast.success('Gabarito gerado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao gerar gabarito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 p-md">
      <h1 className="text-2xl text-orange mb-md">Criar Gabarito</h1>
      <form onSubmit={handleSubmit} className="space-y-md">
        <div className="flex gap-md">
          <input type="file" name="logoLeft" accept="image/*" onChange={handleChange} />
          <input type="file" name="logoRight" accept="image/*" onChange={handleChange} />
        </div>
        <input
          name="schoolName"
          className="border p-sm rounded w-full"
          placeholder="Nome da Escola"
          value={form.schoolName}
          onChange={handleChange}
        />
        <input
          name="discipline"
          className="border p-sm rounded w-full"
          placeholder="Disciplina"
          value={form.discipline}
          onChange={handleChange}
        />
        <input
          name="teacher"
          className="border p-sm rounded w-full"
          placeholder="Professor"
          value={form.teacher}
          onChange={handleChange}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Gerando...' : 'Gerar PDF'}
        </button>
      </form>
      {previewUrl && (
        <iframe title="Prévia" src={previewUrl} className="w-full h-96 mt-md" />
      )}
    </div>
  );
}

export default CriarGabarito;
