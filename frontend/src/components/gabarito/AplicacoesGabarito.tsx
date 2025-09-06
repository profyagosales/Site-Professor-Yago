import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal.tsx';
import { Input } from '@/components/ui/Input.tsx';
import Select from '@/components/ui/Select.tsx';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  listAplicacoes, 
  createAplicacao, 
  updateAplicacaoStatus,
  listGabaritos,
  calculateAplicacaoStats,
  type AplicacaoGabarito,
  type Gabarito,
  type ProcessamentoOMR
} from '@/services/gabaritos';
import { listClasses } from '@/services/classes';
import { ROUTES } from '@/routes';

export default function AplicacoesGabarito() {
  const [aplicacoes, setAplicacoes] = useState<AplicacaoGabarito[]>([]);
  const [gabaritos, setGabaritos] = useState<Gabarito[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [processamentos, setProcessamentos] = useState<ProcessamentoOMR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    gabaritoId: '',
    classId: '',
    scheduledDate: ''
  });

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [aplicacoesData, gabaritosData, classesData, processamentosData] = await Promise.all([
        listAplicacoes(),
        listGabaritos(),
        listClasses(),
        listProcessamentos()
      ]);
      
      setAplicacoes(aplicacoesData);
      setGabaritos(gabaritosData);
      setClasses(classesData);
      setProcessamentos(processamentosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados');
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      gabaritoId: '',
      classId: '',
      scheduledDate: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.gabaritoId || !formData.classId || !formData.scheduledDate) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    try {
      await createAplicacao(formData);
      toast.success('Aplicação criada com sucesso');
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Erro ao criar aplicação:', error);
      toast.error('Erro ao criar aplicação');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'draft' | 'open' | 'closed') => {
    try {
      await updateAplicacaoStatus(id, newStatus);
      toast.success(`Status alterado para ${newStatus === 'open' ? 'aberto' : newStatus === 'closed' ? 'fechado' : 'rascunho'}`);
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'open': return 'Aberto';
      case 'closed': return 'Fechado';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-600">Carregando aplicações...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Aplicações de Gabaritos</h2>
          <p className="text-gray-600">Associe gabaritos a turmas e gerencie aplicações</p>
        </div>
        <Button onClick={handleCreate} variant="primary">
          Nova Aplicação
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadData} variant="outline" size="sm">
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de aplicações */}
      {aplicacoes.length === 0 ? (
        <Card className="p-8">
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
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhuma aplicação criada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando sua primeira aplicação de gabarito.
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate} variant="primary">
                Criar Primeira Aplicação
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {aplicacoes.map((aplicacao) => {
            const stats = calculateAplicacaoStats(aplicacao, processamentos);
            return (
              <Card key={aplicacao.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {aplicacao.gabarito.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(aplicacao.status)}`}>
                        {getStatusLabel(aplicacao.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Turma:</span> {aplicacao.className}
                      </div>
                      <div>
                        <span className="font-medium">Data:</span> {formatDate(aplicacao.scheduledDate)}
                      </div>
                      <div>
                        <span className="font-medium">Questões:</span> {aplicacao.gabarito.numQuestions}
                      </div>
                    </div>
                    
                    {/* Estatísticas de processamento */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.totalProcessed}
                        </div>
                        <div className="text-xs text-gray-600">Processados</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.successful}
                        </div>
                        <div className="text-xs text-gray-600">Corrigidos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {stats.errors}
                        </div>
                        <div className="text-xs text-gray-600">Erros</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {stats.pending}
                        </div>
                        <div className="text-xs text-gray-600">Pendentes</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    {/* Ações de status */}
                    <div className="flex space-x-2">
                      {aplicacao.status === 'draft' && (
                        <Button
                          onClick={() => handleStatusChange(aplicacao.id, 'open')}
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                        >
                          Abrir
                        </Button>
                      )}
                      {aplicacao.status === 'open' && (
                        <Button
                          onClick={() => handleStatusChange(aplicacao.id, 'closed')}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Fechar
                        </Button>
                      )}
                      {aplicacao.status === 'closed' && (
                        <Button
                          onClick={() => handleStatusChange(aplicacao.id, 'open')}
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                        >
                          Reabrir
                        </Button>
                      )}
                    </div>
                    
                    {/* Links para outras páginas */}
                    <div className="flex space-x-2">
                      <Link
                        to={`${ROUTES.prof.notasClasse}?classId=${aplicacao.classId}&evaluationId=${aplicacao.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Ver Notas
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de criação */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Aplicação"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gabaritoId" className="block text-sm font-medium text-gray-700 mb-1">
              Gabarito *
            </label>
            <Select
              id="gabaritoId"
              value={formData.gabaritoId}
              onChange={(e) => setFormData({ ...formData, gabaritoId: e.target.value })}
              required
            >
              <option value="">Selecione um gabarito</option>
              {gabaritos.map((gabarito) => (
                <option key={gabarito.id} value={gabarito.id}>
                  {gabarito.title} ({gabarito.numQuestions} questões)
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <label htmlFor="classId" className="block text-sm font-medium text-gray-700 mb-1">
              Turma *
            </label>
            <Select
              id="classId"
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              required
            >
              <option value="">Selecione uma turma</option>
              {classes.map((classe) => (
                <option key={classe.id} value={classe.id}>
                  {classe.series}º {classe.letter} - {classe.discipline}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
              Data e Hora da Aplicação *
            </label>
            <Input
              id="scheduledDate"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Criar Aplicação
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
