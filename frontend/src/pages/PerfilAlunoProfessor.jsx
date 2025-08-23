import { useState } from 'react';
import { toast } from 'react-toastify';
import { toArray } from '@/lib/api';

function PerfilAlunoProfessor() {
  const student = {
    photo: 'https://via.placeholder.com/150',
    name: 'Maria Silva',
    email: 'maria.silva@example.com',
    phone: '(11) 98765-4321',
    callNumber: 23,
    grades: [
      { term: '1º Bimestre', average: 8.5 },
      { term: '2º Bimestre', average: 7.0 },
      { term: '3º Bimestre', average: 9.0 },
      { term: '4º Bimestre', average: 8.0 },
    ],
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const arrify = (v) => {
    const r = toArray ? toArray(v) : undefined;
    return Array.isArray(r) ? r : Array.isArray(v) ? v : v ? [v] : [];
  };

  const exportPDF = () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      window.print();
      const message = 'PDF exportado';
      setSuccess(message);
      toast.success(message);
    } catch (err) {
      const message = 'Erro ao exportar PDF';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      window.location.href = `mailto:${student.email}?subject=Boletim`;
      const message = 'E-mail preparado';
      setSuccess(message);
      toast.success(message);
    } catch (err) {
      const message = 'Erro ao enviar e-mail';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 p-md">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 p-md">
      <div className="max-w-3xl mx-auto space-y-md">
        <div className="card flex flex-col items-center">
          <img
            src={student.photo}
            alt={student.name}
            className="w-32 h-32 rounded-full object-cover mb-md"
          />
          <h1 className="text-xl font-semibold">{student.name}</h1>
          <p>{student.email}</p>
          <p>{student.phone}</p>
          <p>Nº chamada: {student.callNumber}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {arrify(student.grades).map((g) => (
            <div
              key={g.term}
              className="card"
            >
              <h2 className="font-semibold">{g.term}</h2>
              <div className="w-full bg-lightGray h-2 rounded-full mb-2">
                <div
                  className="bg-orange h-2 rounded-full"
                  style={{ width: `${(g.average / 10) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-black/70">Média: {g.average}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-md justify-center">
          <button onClick={exportPDF} className="btn-primary">
            Exportar PDF
          </button>
          <button onClick={sendEmail} className="btn-primary">
            Enviar por E-mail
          </button>
        </div>
        {error && <p className="text-red-500 text-center">{error}</p>}
        {success && <p className="text-green-500 text-center">{success}</p>}
      </div>
    </div>
  );
}

export default PerfilAlunoProfessor;
