import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import { toast } from 'react-toastify';
import { 
  createGabarito, 
  updateGabarito, 
  deleteGabarito, 
  listGabaritos,
  type Gabarito 
} from '@/services/gabaritos';

export default function GabaritosEmBranco() {
  const [gabaritos, setGabaritos] = useState<Gabarito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGabarito, setEditingGabarito] = useState<Gabarito | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    answerKey: '',
    numQuestions: 10
  });

  // Carregar gabaritos
  useEffect(() => {
    loadGabaritos();
  }, []);

  const loadGabaritos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listGabaritos();
      setGabaritos(data);
    } catch (error) {
      console.error('Erro ao carregar gabaritos:', error);
      setError('Erro ao carregar gabaritos');
      toast.error('Erro ao carregar gabaritos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGabarito(null);
    setFormData({
      title: '',
      answerKey: '',
      numQuestions: 10
    });
    setShowModal(true);
  };

  const handleEdit = (gabarito: Gabarito) => {
    setEditingGabarito(gabarito);
    setFormData({
      title: gabarito.title,
      answerKey: gabarito.answerKey,
      numQuestions: gabarito.numQuestions
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este gabarito?')) return;
    
    try {
      await deleteGabarito(id);
      toast.success('Gabarito excluído com sucesso');
      loadGabaritos();
    } catch (error) {
      console.error('Erro ao excluir gabarito:', error);
      toast.error('Erro ao excluir gabarito');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    
    if (!formData.answerKey.trim()) {
      toast.error('Gabarito é obrigatório');
      return;
    }
    
    if (formData.numQuestions < 1 || formData.numQuestions > 100) {
      toast.error('Número de questões deve estar entre 1 e 100');
      return;
    }
    
    // Validar consistência do gabarito
    const answerKeyLength = formData.answerKey.replace(/\s/g, '').length;
    if (answerKeyLength !== formData.numQuestions) {
      toast.error(`Gabarito deve ter exatamente ${formData.numQuestions} respostas`);
      return;
    }
    
    // Validar caracteres válidos (A, B, C, D, E)
    const validAnswers = /^[ABCDE\s]*$/i;
    if (!validAnswers.test(formData.answerKey)) {
      toast.error('Gabarito deve conter apenas letras A, B, C, D ou E');
      return;
    }

    try {
      if (editingGabarito) {
        await updateGabarito(editingGabarito.id, formData);
        toast.success('Gabarito atualizado com sucesso');
      } else {
        await createGabarito(formData);
        toast.success('Gabarito criado com sucesso');
      }
      
      setShowModal(false);
      loadGabaritos();
    } catch (error) {
      console.error('Erro ao salvar gabarito:', error);
      toast.error('Erro ao salvar gabarito');
    }
  };

  const formatAnswerKey = (answerKey: string) => {
    return answerKey.replace(/\s/g, '').split('').join(' ');
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-600">Carregando gabaritos...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gabaritos em Branco</h2>
          <p className="text-gray-600">Crie e gerencie modelos de gabaritos para provas objetivas</p>
        </div>
        <Button onClick={handleCreate} variant="primary" data-testid="create-gabarito-button">
          Criar Gabarito
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadGabaritos} variant="outline" size="sm">
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de gabaritos */}
      {gabaritos.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum gabarito criado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando seu primeiro gabarito em branco.
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate} variant="primary">
                Criar Primeiro Gabarito
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gabaritos.map((gabarito) => (
            <Card key={gabarito.id} className="p-6 hover:shadow-md transition-shadow" data-testid={`gabarito-card-${gabarito.id}`}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {gabarito.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {gabarito.numQuestions} questões
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Gabarito:
                  </div>
                  <div className="font-mono text-lg text-gray-900">
                    {formatAnswerKey(gabarito.answerKey)}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Criado em {new Date(gabarito.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEdit(gabarito)}
                      variant="outline"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(gabarito.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingGabarito ? 'Editar Gabarito' : 'Criar Gabarito'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título do Gabarito *
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Prova de Matemática - 1º Bimestre"
              required
            />
          </div>
          
          <div>
            <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700 mb-1">
              Número de Questões *
            </label>
            <Input
              id="numQuestions"
              type="number"
              min="1"
              max="100"
              value={formData.numQuestions}
              onChange={(e) => setFormData({ ...formData, numQuestions: parseInt(e.target.value) || 10 })}
              required
            />
          </div>
          
          <div>
            <label htmlFor="answerKey" className="block text-sm font-medium text-gray-700 mb-1">
              Gabarito (A, B, C, D, E) *
            </label>
            <Textarea
              id="answerKey"
              value={formData.answerKey}
              onChange={(e) => setFormData({ ...formData, answerKey: e.target.value.toUpperCase() })}
              placeholder="Ex: A B C D E A B C D E"
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite as respostas separadas por espaço. Ex: A B C D E
            </p>
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
              {editingGabarito ? 'Atualizar' : 'Criar'} Gabarito
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
