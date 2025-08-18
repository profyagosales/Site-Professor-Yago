import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function DetalhesNotaAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [bimesters, setBimesters] = useState({});

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/grades/student/${id}`);
        setStudent(res.data.student);
        setBimesters(res.data.bimesters || {});
      } catch (err) {
        console.error('Erro ao carregar notas do aluno', err);
      }
    };
    fetchGrades();
  }, [id]);

  const handleExport = () => {
    window.open(`http://localhost:5000/grades/student/${id}/export`, '_blank');
  };

  const handleSend = async () => {
    try {
      await axios.post(`http://localhost:5000/grades/student/${id}/send`);
      alert('Relatório enviado');
    } catch (err) {
      console.error('Erro ao enviar relatório', err);
    }
  };

  return (
    <div className="pt-20 p-md">
      <div className="flex justify-between items-center mb-md">
        <h1 className="text-xl text-orange">
          {student ? `Notas de ${student.name}` : 'Carregando...'}
        </h1>
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
    </div>
  );
}

export default DetalhesNotaAluno;

