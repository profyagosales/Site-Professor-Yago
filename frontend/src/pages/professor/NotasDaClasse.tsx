import { Page } from '@/components/Page';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import GradeMatrix from '@/components/GradeMatrix';
import { getClassById } from '@/services/classes';
import { ROUTES } from '@/routes';

export default function NotasDaClasse() {
  const { id: classId } = useParams();
  const [searchParams] = useSearchParams();
  const [classeInfo, setClasseInfo] = useState<any | null>(null);
  const [term, setTerm] = useState(searchParams.get('term') || '1');

  // Carregar informações da turma
  useEffect(() => {
    if (!classId) return;
    
    const loadClassInfo = async () => {
      try {
        const info = await getClassById(classId);
        setClasseInfo(info);
      } catch (error) {
        console.error('Erro ao carregar informações da turma:', error);
      }
    };
    
    loadClassInfo();
  }, [classId]);

  const titulo = classeInfo
    ? `${classeInfo.series || ''}º ${classeInfo.letter || ''} — ${classeInfo.discipline || ''}`.trim()
    : 'Notas da Classe';

  if (!classId) {
    return (
      <Page title="Notas da Classe" subtitle="Selecione uma turma para visualizar as notas.">
        <div className="text-center py-8">
          <p className="text-ys-ink-2">Turma não encontrada.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page title={titulo} subtitle="Matriz de notas editável">
      <div className="space-y-6">
        {/* Seletor de bimestre */}
        <div className="flex items-center gap-4">
          <label htmlFor="term-select" className="text-sm font-medium text-gray-700">
            Bimestre:
          </label>
          <select
            id="term-select"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1º Bimestre</option>
            <option value="2">2º Bimestre</option>
            <option value="3">3º Bimestre</option>
            <option value="4">4º Bimestre</option>
          </select>
        </div>

        {/* Matriz de notas */}
        <GradeMatrix
          classId={classId}
          term={term}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        />

        {/* Informações adicionais */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Instruções:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Digite notas de 0 a 10 com até 1 casa decimal (ex: 8.5)</li>
            <li>• Use as setas do teclado para navegar entre as células</li>
            <li>• Pressione Enter para ir para a próxima linha</li>
            <li>• As notas são salvas automaticamente com debounce de 800ms</li>
            <li>• A média é calculada automaticamente com base nos pesos das avaliações</li>
          </ul>
        </div>
      </div>
    </Page>
  );
}
