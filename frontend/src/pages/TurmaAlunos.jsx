import { useParams } from 'react-router-dom';

function TurmaAlunos() {
  const { id } = useParams();
  return (
    <div className="pt-20 p-md">Alunos da Turma {id}</div>
  );
}

export default TurmaAlunos;
