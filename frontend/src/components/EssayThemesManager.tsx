/**
 * Componente de gerenciamento de temas de redação
 * 
 * Funcionalidades:
 * - Listagem de temas com filtros
 * - CRUD completo
 * - Toggle de estado ativo
 * - Integração com modal de nova redação
 */

import { useState, useEffect } from 'react';
import { useEssayThemes } from '@/hooks/useEssayThemes';
import { formatThemeType, getThemeTypeColor } from '@/services/essayThemes';
import { type EssayTheme } from '@/services/essayThemes';

export interface EssayThemesManagerProps {
  onThemeSelect?: (theme: EssayTheme) => void;
  onClose?: () => void;
  className?: string;
}

export default function EssayThemesManager({
  onThemeSelect,
  onClose,
  className = '',
}: EssayThemesManagerProps) {
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeType, setNewThemeType] = useState<'ENEM' | 'PAS' | 'OUTRO'>('PAS');
  const [editingTheme, setEditingTheme] = useState<EssayTheme | null>(null);
  const [editName, setEditName] = useState('');

  const {
    themes,
    filteredThemes,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    createNewTheme,
    updateExistingTheme,
    toggleThemeActive,
    deleteExistingTheme,
    setSearch,
    setType,
    setOnlyActive,
    clearError,
  } = useEssayThemes({
    autoLoad: true,
    showToasts: true,
    enableLogging: true,
  });

  // Reset form quando modal fecha
  useEffect(() => {
    if (!onClose) {
      setNewThemeName('');
      setNewThemeType('PAS');
      setEditingTheme(null);
      setEditName('');
    }
  }, [onClose]);

  const handleCreateTheme = async () => {
    if (!newThemeName.trim()) return;

    const theme = await createNewTheme({
      name: newThemeName.trim(),
      type: newThemeType,
      active: true,
    });

    if (theme) {
      setNewThemeName('');
      setNewThemeType('PAS');
    }
  };

  const handleUpdateTheme = async () => {
    if (!editingTheme || !editName.trim()) return;

    const updated = await updateExistingTheme(editingTheme.id, {
      name: editName.trim(),
    });

    if (updated) {
      setEditingTheme(null);
      setEditName('');
    }
  };

  const handleToggleActive = async (theme: EssayTheme) => {
    await toggleThemeActive(theme.id);
  };

  const handleDeleteTheme = async (theme: EssayTheme) => {
    if (window.confirm(`Tem certeza que deseja remover o tema "${theme.name}"?`)) {
      await deleteExistingTheme(theme.id);
    }
  };

  const handleUseTheme = (theme: EssayTheme) => {
    onThemeSelect?.(theme);
    onClose?.();
  };

  const startEditing = (theme: EssayTheme) => {
    setEditingTheme(theme);
    setEditName(theme.name);
  };

  const cancelEditing = () => {
    setEditingTheme(null);
    setEditName('');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Gerenciar Temas de Redação
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar
          </label>
          <input
            type="text"
            placeholder="Nome do tema..."
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            onChange={(e) => setType(e.target.value as 'ENEM' | 'PAS' | 'OUTRO' | undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="ENEM">ENEM</option>
            <option value="PAS">PAS</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Apenas ativos</span>
          </label>
        </div>
      </div>

      {/* Formulário de novo tema */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Novo Tema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do tema
            </label>
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Ex: Desafios da educação no Brasil"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={newThemeType}
              onChange={(e) => setNewThemeType(e.target.value as 'ENEM' | 'PAS' | 'OUTRO')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PAS">PAS</option>
              <option value="ENEM">ENEM</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={handleCreateTheme}
            disabled={!newThemeName.trim() || isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Criando...' : 'Criar Tema'}
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={clearError}
            className="text-sm text-red-600 underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lista de temas */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando temas...</p>
          </div>
        ) : filteredThemes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Nenhum tema encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tema
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredThemes.map((theme) => (
                  <tr key={theme.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      {editingTheme?.id === theme.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateTheme();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {theme.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getThemeTypeColor(theme.type)}`}>
                        {formatThemeType(theme.type)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        theme.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {theme.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {editingTheme?.id === theme.id ? (
                          <>
                            <button
                              onClick={handleUpdateTheme}
                              disabled={!editName.trim() || isUpdating}
                              className="text-sm text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleActive(theme)}
                              disabled={isUpdating}
                              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {theme.active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              onClick={() => startEditing(theme)}
                              className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              Editar
                            </button>
                            {onThemeSelect && (
                              <button
                                onClick={() => handleUseTheme(theme)}
                                className="text-sm text-green-600 hover:text-green-800"
                              >
                                Usar
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTheme(theme)}
                              disabled={isDeleting}
                              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
