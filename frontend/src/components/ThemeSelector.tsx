/**
 * Componente de seleção de tema de redação
 * 
 * Funcionalidades:
 * - Combobox com busca
 * - Fallback para entrada livre
 * - Integração com temas existentes
 * - Validação de entrada
 */

import { useState, useEffect, useRef } from 'react';
import { useEssayThemes } from '@/hooks/useEssayThemes';
import { formatThemeType, getThemeTypeColor } from '@/services/essayThemes';
import { type EssayTheme } from '@/services/essayThemes';

export interface ThemeSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  onThemeSelect?: (theme: EssayTheme) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

export default function ThemeSelector({
  value = '',
  onChange,
  onThemeSelect,
  placeholder = 'Digite o tema da redação...',
  disabled = false,
  className = '',
  'data-testid': testId,
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    filteredThemes,
    isLoading,
    setSearch,
    setOnlyActive,
  } = useEssayThemes({
    onlyActive: true,
    autoLoad: true,
    showToasts: false,
    enableLogging: false,
  });

  // Sincronizar com valor externo
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Atualizar busca quando query muda
  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery, setSearch]);

  // Filtrar temas ativos
  useEffect(() => {
    setOnlyActive(true);
  }, [setOnlyActive]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay para permitir clique nos itens da lista
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredThemes.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredThemes.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredThemes[highlightedIndex]) {
          handleThemeSelect(filteredThemes[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleThemeSelect = (theme: EssayTheme) => {
    setSearchQuery(theme.name);
    onChange(theme.name);
    onThemeSelect?.(theme);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      onChange(searchQuery.trim());
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Scroll para item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const getInputClasses = () => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (isOpen) {
      return `${baseClasses} border-blue-300 bg-blue-50`;
    }
    
    return `${baseClasses} border-gray-300`;
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={getInputClasses()}
        data-testid={testId}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto"></div>
              <span className="ml-2 text-sm">Carregando...</span>
            </div>
          ) : filteredThemes.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              <p className="text-sm">Nenhum tema encontrado</p>
              {searchQuery.trim() && (
                <button
                  onClick={handleCreateNew}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Criar tema "{searchQuery.trim()}"
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredThemes.map((theme, index) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                    index === highlightedIndex ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {theme.name}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getThemeTypeColor(theme.type)}`}>
                      {formatThemeType(theme.type)}
                    </span>
                  </div>
                </button>
              ))}
              
              {searchQuery.trim() && !filteredThemes.some(theme => 
                theme.name.toLowerCase() === searchQuery.toLowerCase()
              ) && (
                <button
                  onClick={handleCreateNew}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-t border-gray-200"
                >
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-blue-600">
                      Criar tema "{searchQuery.trim()}"
                    </span>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
