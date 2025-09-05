/**
 * Componente de paginação reutilizável
 *
 * Funcionalidades:
 * - Controles Anterior/Próxima
 * - Salto para página específica
 * - Indicador de página atual
 * - Responsivo e acessível
 */

import React from 'react';

export interface PaginationProps {
  // Estado atual
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;

  // Callbacks
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  // Opções de configuração
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  showTotal?: boolean;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  showPageInput?: boolean;

  // Estilo
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  pageSizeOptions = [5, 10, 20, 50],
  showTotal = true,
  showPageNumbers = true,
  maxVisiblePages = 5,
  showFirstLast = true,
  showPrevNext = true,
  showPageInput = false,
  className = '',
  disabled = false,
  loading = false,
}: PaginationProps) {
  // Calcula páginas visíveis
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Estado para input de página
  const [pageInput, setPageInput] = React.useState(currentPage.toString());

  // Atualiza input quando página muda
  React.useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Função para lidar com input de página
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  if (totalPages <= 1 && !showPageSizeSelector) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {/* Informações da página */}
      {showTotal && (
        <div className='text-sm text-gray-600'>
          Mostrando {startItem} a {endItem} de {totalItems} itens
        </div>
      )}

      {/* Seletor de tamanho da página */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className='flex items-center gap-2'>
          <label htmlFor='page-size' className='text-sm text-gray-600'>
            Itens por página:
          </label>
          <select
            id='page-size'
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className='border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50'
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Controles de paginação */}
      {totalPages > 1 && (
        <div className='flex items-center gap-1'>
          {/* Botão Primeira página */}
          {showFirstLast && (
            <button
              onClick={() => onPageChange(1)}
              disabled={!hasPrevious || disabled || loading}
              className='px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500'
              aria-label='Primeira página'
            >
              ««
            </button>
          )}

          {/* Botão Anterior */}
          {showPrevNext && (
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevious || disabled || loading}
              className='px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500'
              aria-label='Página anterior'
            >
              «
            </button>
          )}

          {/* Números das páginas */}
          {showPageNumbers && (
            <>
              {/* Primeira página */}
              {visiblePages[0] > 1 && (
                <>
                  <button
                    onClick={() => onPageChange(1)}
                    disabled={disabled}
                    className='px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500'
                  >
                    1
                  </button>
                  {visiblePages[0] > 2 && (
                    <span className='px-2 text-gray-500'>...</span>
                  )}
                </>
              )}

              {/* Páginas visíveis */}
              {visiblePages.map(page => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  disabled={disabled || loading}
                  className={`px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    page === currentPage
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  aria-label={`Página ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}

              {/* Última página */}
              {visiblePages[visiblePages.length - 1] < totalPages && (
                <>
                  {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                    <span className='px-2 text-gray-500'>...</span>
                  )}
                  <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={disabled || loading}
                    className='px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500'
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </>
          )}

          {/* Input de página */}
          {showPageInput && (
            <form
              onSubmit={handlePageInputSubmit}
              className='flex items-center gap-1'
            >
              <span className='text-sm text-gray-600'>Ir para:</span>
              <input
                type='number'
                min='1'
                max={totalPages}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                disabled={disabled || loading}
                className='w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50'
                aria-label='Número da página'
              />
              <button
                type='submit'
                disabled={disabled || loading}
                className='px-2 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500'
              >
                Ir
              </button>
            </form>
          )}

          {/* Botão Próxima */}
          {showPrevNext && (
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNext || disabled || loading}
              className='px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500'
              aria-label='Próxima página'
            >
              »
            </button>
          )}

          {/* Botão Última página */}
          {showFirstLast && (
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNext || disabled || loading}
              className='px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500'
              aria-label='Última página'
            >
              »»
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook para gerenciar estado de paginação
 */
export function usePagination(
  initialPage: number = 1,
  initialPageSize: number = 10
) {
  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const goToPage = React.useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const goToNextPage = React.useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  const goToPreviousPage = React.useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = React.useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = React.useCallback((totalPages: number) => {
    setCurrentPage(totalPages);
  }, []);

  const changePageSize = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Volta para a primeira página
  }, []);

  const reset = React.useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    currentPage,
    pageSize,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    reset,
  };
}
