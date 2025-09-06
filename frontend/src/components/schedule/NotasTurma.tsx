import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';

interface NotasTurmaProps {
  classId: string;
}

export default function NotasTurma({ classId }: NotasTurmaProps) {
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
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Gerenciar Notas
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Acesse a página de notas para gerenciar as avaliações e notas desta turma.
        </p>
        <div className="mt-6">
          <Link to={`${ROUTES.prof.notasClasse}?classId=${classId}`}>
            <Button variant="primary">
              Ver Notas da Turma
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
