import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardTitle, CardSub } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function PasUnbPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <nav className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Início / PAS/UnB
      </nav>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">PAS/UnB</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <CardTitle>PAS/UnB</CardTitle>
          <CardSub>
            Reunimos nesta área materiais, avisos e novidades sobre o Programa de Avaliação Seriada da UnB.
          </CardSub>
          <p className="text-sm text-slate-600">
            Em breve você encontrará cronogramas, conteúdos de revisão, simulados e orientações específicas
            para cada etapa do PAS. Enquanto isso, continue acompanhando o resumo da sua turma para não
            perder nenhum aviso importante.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
