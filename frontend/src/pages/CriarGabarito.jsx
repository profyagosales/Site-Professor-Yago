import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
        const res = await api.get('/api/classes');
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

  const embedImage = async (pdfDoc, file) => {
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    const type = (file.type || file.name || '').toLowerCase();
    try {
      if (type.includes('png')) return await pdfDoc.embedPng(buffer);
      return await pdfDoc.embedJpg(buffer);
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const left = await embedImage(pdfDoc, form.logoLeft);
      const right = await embedImage(pdfDoc, form.logoRight);

      const margin = 40;
      const top = 800;

      if (left) {
        const scale = 60 / left.height;
        page.drawImage(left, {
          x: margin,
          y: top - left.height * scale,
          width: left.width * scale,
          height: left.height * scale,
        });
      }

      if (right) {
        const scale = 60 / right.height;
        const width = right.width * scale;
        page.drawImage(right, {
          x: 595 - margin - width,
          y: top - right.height * scale,
          width,
          height: right.height * scale,
        });
      }

      page.drawText(form.schoolName || '', {
        x: margin,
        y: top - 80,
        size: 16,
        font,
        color: rgb(0, 0, 0),
      });
      page.drawText(form.discipline || '', {
        x: margin,
        y: top - 105,
        size: 12,
        font,
      });
      page.drawText(form.teacher || '', {
        x: margin,
        y: top - 125,
        size: 12,
        font,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setPreviewUrl(URL.createObjectURL(blob));

      const fd = new FormData();
      fd.append('logoLeft', form.logoLeft);
      fd.append('logoRight', form.logoRight);
      fd.append('schoolName', form.schoolName);
      fd.append('discipline', form.discipline);
      fd.append('teacher', form.teacher);
      await createGabarito(fd);
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
          <input type="file" name="logoLeft" accept="image/png,image/jpeg" onChange={handleChange} />
          <input type="file" name="logoRight" accept="image/png,image/jpeg" onChange={handleChange} />
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
        <button type="submit" className="ys-btn-primary" disabled={loading}>
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
