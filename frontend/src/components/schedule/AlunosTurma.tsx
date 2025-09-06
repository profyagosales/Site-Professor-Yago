import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AlunosTurmaProps {
  classId: string;
}

export default function AlunosTurma({ classId }: AlunosTurmaProps) {
  return (
    <Card className="p-6">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Gerenciar Alunos
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Acesse a página de alunos para gerenciar a lista de estudantes desta turma.
        </p>
        <div className="mt-6">
          <Link to={ROUTES.prof.turmaAlunos(classId)}>
            <Button variant="primary">
              Ver Lista de Alunos
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
