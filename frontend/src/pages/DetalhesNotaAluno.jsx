import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentGrades, exportStudentPdf, sendStudentReport } from '@/services/grades';
import { toast } from 'react-toastify';

function DetalhesNotaAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [bimesters, setBimesters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchGrades = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentGrades(id);
        setStudent(data.student);
        setBimesters(data.bimesters || {});
      } catch (err) {
        console.error('Erro ao carregar notas do aluno', err);
        setError('Erro ao carregar notas do aluno');
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [id]);

  const handleExport = async () => {
    try {
      const blob = await exportStudentPdf(id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
      const message = 'PDF exportado';
      setSuccess(message);
      toast.success(message);
    } catch (err) {
      console.error('Erro ao exportar PDF', err);
      const message = 'Erro ao exportar PDF';
      setError(message);
      toast.error(message);
    }
  };

  const handleSend = async () => {
    try {
      await sendStudentReport(id);
      const message = 'Relatório enviado';
      setSuccess(message);
      toast.success(message);
    } catch (err) {
      console.error('Erro ao enviar relatório', err);
      const message = 'Erro ao enviar relatório';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="pt-20 p-md">
      {loading ? (
        <p>Carregando notas...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="flex justify-between items-center mb-md">
            <h1 className="text-xl text-orange">Notas de {student.name}</h1>
            <button className="link-primary" onClick={() => navigate(-1)}>
              Voltar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-md">
            {[1, 2, 3, 4].map((b) => (
              <div
                key={b}
                className="card"
              >
                <h2 className="font-semibold">{b}º Bimestre</h2>
                <ul className="space-y-xs">
                  {(bimesters[b] || []).map((ev, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{ev.type}</span>
                      <span>
                        {ev.score} / {ev.totalValue}
                      </span>
                    </li>
                  ))}
                  {(!bimesters[b] || bimesters[b].length === 0) && (
                    <li className="text-sm text-black/70">Sem avaliações</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex gap-md justify-center">
            <button className="btn-primary" onClick={handleExport}>
              Exportar PDF
            </button>
            <button className="btn-primary" onClick={handleSend}>
              Enviar para o Aluno
            </button>
          </div>
          {success && <p className="text-green-500 text-center mt-md">{success}</p>}
        </>
      )}
    </div>
  );
}

export default DetalhesNotaAluno;

