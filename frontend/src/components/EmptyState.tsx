/**
 * Componente de estado vazio reutilizável
 *
 * Funcionalidades:
 * - Mensagem personalizável
 * - Ícone opcional
 * - Call-to-action opcional
 * - Diferentes variações de estilo
 */

import React from 'react';

export interface EmptyStateProps {
  // Conteúdo
  title: string;
  description?: string;
  icon?: React.ReactNode;

  // Call-to-action
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary' | 'ghost';

  // Estilo
  variant?: 'default' | 'minimal' | 'card';
  size?: 'sm' | 'md' | 'lg';
  className?: string;

  // Acessibilidade
  'aria-label'?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  variant = 'default',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
  };

  const iconSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const titleSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const descriptionSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const actionClasses = {
    primary:
      'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500',
    secondary:
      'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    ghost:
      'text-orange-600 hover:text-orange-700 hover:bg-orange-50 focus:ring-orange-500',
  };

  const containerClasses = {
    default: 'text-center',
    minimal: 'text-center',
    card: 'text-center bg-white rounded-lg border border-gray-200 shadow-sm',
  };

  return (
    <div
      className={`${containerClasses[variant]} ${sizeClasses[size]} ${className}`}
      role='status'
      aria-label={ariaLabel || `Estado vazio: ${title}`}
    >
      <div className='max-w-md mx-auto'>
        {/* Ícone */}
        {icon && (
          <div
            className={`mx-auto mb-4 text-gray-400 ${iconSizeClasses[size]}`}
          >
            {icon}
          </div>
        )}

        {/* Título */}
        <h3
          className={`font-semibold text-gray-900 mb-2 ${titleSizeClasses[size]}`}
        >
          {title}
        </h3>

        {/* Descrição */}
        {description && (
          <p className={`text-gray-600 mb-6 ${descriptionSizeClasses[size]}`}>
            {description}
          </p>
        )}

        {/* Call-to-action */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${actionClasses[actionVariant]}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Componente especializado para lista vazia de redações
 */
export function EmptyEssaysState({
  status,
  onNewEssay,
  className = '',
}: {
  status: 'pendentes' | 'corrigidas';
  onNewEssay: () => void;
  className?: string;
}) {
  const getContent = () => {
    if (status === 'pendentes') {
      return {
        title: 'Nenhuma redação pendente',
        description: 'Não há redações aguardando correção no momento.',
        actionLabel: 'Nova Redação',
        icon: (
          <svg
            className='w-full h-full'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
        ),
      };
    } else {
      return {
        title: 'Nenhuma redação corrigida',
        description: 'Não há redações corrigidas para exibir.',
        actionLabel: 'Ver Pendentes',
        icon: (
          <svg
            className='w-full h-full'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        ),
      };
    }
  };

  const content = getContent();

  return (
    <EmptyState
      title={content.title}
      description={content.description}
      icon={content.icon}
      actionLabel={content.actionLabel}
      onAction={onNewEssay}
      variant='card'
      size='lg'
      className={className}
    />
  );
}

/**
 * Hook para gerenciar estado vazio
 */
export function useEmptyState() {
  const [isEmpty, setIsEmpty] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const setEmpty = React.useCallback((empty: boolean, msg?: string) => {
    setIsEmpty(empty);
    if (msg) {
      setMessage(msg);
    }
  }, []);

  const clearEmpty = React.useCallback(() => {
    setIsEmpty(false);
    setMessage('');
  }, []);

  return {
    isEmpty,
    message,
    setEmpty,
    clearEmpty,
  };
}
