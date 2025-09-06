import { useState, useEffect } from 'react';
import { wrapInterval, count } from '@/lib/net-debug';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import Select from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  listProcessamentos, 
  startProcessamento,
  listAplicacoes,
  type ProcessamentoOMR,
  type AplicacaoGabarito
} from '@/services/gabaritos';
import { upsertGrade } from '@/services/grades';
import { ROUTES } from '@/routes';

export default function ProcessamentoOMR() {
  const [processamentos, setProcessamentos] = useState<ProcessamentoOMR[]>([]);
  const [aplicacoes, setAplicacoes] = useState<AplicacaoGabarito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAplicacao, setSelectedAplicacao] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Carregar dados
  useEffect(() => {
    count('ProcessamentoOMR/load-data');
    loadData();
    
    // Polling para atualizar status dos processamentos
    const clearPollingInterval = wrapInterval(loadData, 5000, 'ProcessamentoOMR/polling');
    return () => clearPollingInterval();
  }, [loadData]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [processamentosData, aplicacoesData] = await Promise.all([
        listProcessamentos(),
        listAplicacoes()
      ]);
      
      setProcessamentos(processamentosData);
      setAplicacoes(aplicacoesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados');
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const validTypes = ['application/pdf', 'application/zip'];
      if (!validTypes.includes(file.type)) {
        toast.error('Apenas arquivos PDF e ZIP são aceitos');
        return;
      }
      
      // Validar tamanho (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 50MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !selectedAplicacao) {
      toast.error('Selecione um arquivo e uma aplicação');
      return;
    }

    try {
      setUploading(true);
      const processamento = await startProcessamento(selectedAplicacao, selectedFile);
      
      toast.success('Processamento iniciado com sucesso');
      setShowUploadModal(false);
      setSelectedFile(null);
      setSelectedAplicacao('');
      loadData();
    } catch (error) {
      console.error('Erro ao iniciar processamento:', error);
      toast.error('Erro ao iniciar processamento');
    } finally {
      setUploading(false);
    }
  };

  const handleProcessamentoComplete = async (processamento: ProcessamentoOMR) => {
    if (processamento.status === 'done' && processamento.results) {
      try {
        // Salvar notas automaticamente
        for (const grade of processamento.results.grades) {
          await upsertGrade({
            studentId: grade.studentId,
            evaluationId: processamento.aplicacaoId,
            score: grade.score,
            term: 1, // Assumindo 1º bimestre por padrão
            weight: 1
          });
        }
        
        toast.success(`${processamento.results.grades.length} notas salvas automaticamente`);
      } catch (error) {
        console.error('Erro ao salvar notas:', error);
        toast.error('Erro ao salvar algumas notas');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'queued': return 'Na Fila';
      case 'processing': return 'Processando';
      case 'done': return 'Concluído';
      case 'error': return 'Erro';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Verificar processamentos concluídos
  useEffect(() => {
    processamentos.forEach(processamento => {
      if (processamento.status === 'done' && processamento.results) {
        handleProcessamentoComplete(processamento);
      }
    });
  }, [processamentos]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-600">Carregando processamentos...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Processamento OMR</h2>
          <p className="text-gray-600">Upload e correção automática de folhas preenchidas</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} variant="primary">
          Novo Upload
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

      {/* Estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {processamentos.length}
            </div>
            <div className="text-sm text-gray-600">Total de Processamentos</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {processamentos.filter(p => p.status === 'done').length}
            </div>
            <div className="text-sm text-gray-600">Concluídos</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {processamentos.filter(p => p.status === 'queued' || p.status === 'processing').length}
            </div>
            <div className="text-sm text-gray-600">Em Andamento</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {processamentos.filter(p => p.status === 'error').length}
            </div>
            <div className="text-sm text-gray-600">Com Erro</div>
          </div>
        </Card>
      </div>

      {/* Lista de processamentos */}
      {processamentos.length === 0 ? (
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum processamento iniciado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Faça upload de folhas preenchidas para iniciar a correção automática.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowUploadModal(true)} variant="primary">
                Fazer Primeiro Upload
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {processamentos.map((processamento) => (
            <Card key={processamento.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {processamento.fileName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(processamento.status)}`}>
                      {getStatusLabel(processamento.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Aplicação:</span> {processamento.aplicacao.gabarito.title}
                    </div>
                    <div>
                      <span className="font-medium">Turma:</span> {processamento.aplicacao.className}
                    </div>
                    <div>
                      <span className="font-medium">Tamanho:</span> {formatFileSize(processamento.fileSize)}
                    </div>
                  </div>
                  
                  {/* Barra de progresso */}
                  {processamento.status === 'processing' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Processando...</span>
                        <span>{processamento.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${processamento.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Resultados */}
                  {processamento.status === 'done' && processamento.results && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {processamento.results.totalProcessed}
                        </div>
                        <div className="text-xs text-gray-600">Processados</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {processamento.results.successful}
                        </div>
                        <div className="text-xs text-gray-600">Corrigidos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {processamento.results.errors}
                        </div>
                        <div className="text-xs text-gray-600">Erros</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {Math.round((processamento.results.successful / processamento.results.totalProcessed) * 100)}%
                        </div>
                        <div className="text-xs text-gray-600">Taxa de Sucesso</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Erro */}
                  {processamento.status === 'error' && processamento.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Erro:</span> {processamento.errorMessage}
                      </p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Iniciado em {formatDate(processamento.createdAt)}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 ml-4">
                  {/* Links para outras páginas */}
                  <div className="flex space-x-2">
                    <Link
                      to={`${ROUTES.prof.notasClasse}?classId=${processamento.aplicacao.classId}&evaluationId=${processamento.aplicacaoId}`}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Ver Notas
                    </Link>
                  </div>
                  
                  {/* Lista de alunos processados */}
                  {processamento.status === 'done' && processamento.results && (
                    <div className="text-xs">
                      <div className="font-medium text-gray-700 mb-1">Alunos Processados:</div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {processamento.results.grades.map((grade, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <Link
                              to={`${ROUTES.prof.alunos}/${grade.studentId}`}
                              className="text-blue-600 hover:text-blue-800 underline truncate max-w-32"
                            >
                              {grade.studentName}
                            </Link>
                            <span className="text-gray-600">{grade.score.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de upload */}
      <Modal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload de Folhas OMR"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label htmlFor="aplicacaoId" className="block text-sm font-medium text-gray-700 mb-1">
              Aplicação *
            </label>
            <Select
              id="aplicacaoId"
              value={selectedAplicacao}
              onChange={(e) => setSelectedAplicacao(e.target.value)}
              required
            >
              <option value="">Selecione uma aplicação</option>
              {aplicacoes.filter(a => a.status === 'open').map((aplicacao) => (
                <option key={aplicacao.id} value={aplicacao.id}>
                  {aplicacao.gabarito.title} - {aplicacao.className}
                </option>
              ))}
            </Select>
          </div>
          
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              Arquivo (PDF ou ZIP) *
            </label>
            <input
              id="file"
              type="file"
              accept=".pdf,.zip"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Apenas arquivos PDF e ZIP são aceitos. Máximo 50MB.
            </p>
          </div>
          
          {selectedFile && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-700">
                <div className="font-medium">Arquivo selecionado:</div>
                <div>{selectedFile.name}</div>
                <div className="text-gray-500">{formatFileSize(selectedFile.size)}</div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUploadModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={uploading || !selectedFile || !selectedAplicacao}
            >
              {uploading ? 'Enviando...' : 'Iniciar Processamento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
