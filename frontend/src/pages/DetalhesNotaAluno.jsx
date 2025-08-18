import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentGrades, exportStudentPdf, sendStudentReport } from '../services/grades';

function DetalhesNotaAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [bimesters, setBimesters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    } catch (err) {
      console.error('Erro ao exportar PDF', err);
    }
  };

  const handleSend = async () => {
    try {
      await sendStudentReport(id);
      alert('Relatório enviado');
    } catch (err) {
      console.error('Erro ao enviar relatório', err);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
            {[1, 2, 3, 4].map((b) => (
              <div
                key={b}
                className="p-md bg-gray-50/30 backdrop-blur-md border border-gray-200 rounded-lg shadow-subtle"
              >
                <h2 className="font-semibold mb-sm">{b}º Bimestre</h2>
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
        </>
      )}
    </div>
  );
}

export default DetalhesNotaAluno;

