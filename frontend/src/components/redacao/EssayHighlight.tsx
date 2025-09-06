/**
 * Componente para highlight de redações recém-criadas
 */

import React from 'react';
import { useEssayHighlight } from '@/hooks/useEssayHighlight';

interface EssayHighlightProps {
  essayId: string;
  children: React.ReactNode;
  className?: string;
}

export default function EssayHighlight({
  essayId,
  children,
  className = '',
}: EssayHighlightProps) {
  const { isHighlighted, getHighlight } = useEssayHighlight();
  const highlight = getHighlight(essayId);
  const isHighlightedNow = isHighlighted(essayId);

  if (!isHighlightedNow) {
    return <>{children}</>;
  }

  return (
    <div
      className={`relative ${className}`}
      style={{
        animation: 'highlightPulse 3s ease-in-out',
      }}
    >
      {/* Overlay de highlight */}
      <div
        className='absolute inset-0 bg-green-100 border-2 border-green-400 rounded-lg pointer-events-none'
        style={{
          animation: 'highlightFade 3s ease-in-out forwards',
        }}
      />

      {/* Badge de "Nova" */}
      <div
        className='absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10'
        style={{
          animation: 'highlightBounce 3s ease-in-out',
        }}
      >
        Nova
      </div>

      {/* Conteúdo original */}
      <div className='relative z-0'>{children}</div>

      {/* Estilos CSS inline para as animações */}
      <style jsx>{`
        @keyframes highlightPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes highlightFade {
          0% {
            opacity: 0.8;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes highlightBounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
          60% {
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook para usar o highlight em componentes de lista
 */
export function useEssayHighlightClass(essayId: string): string {
  const { isHighlighted } = useEssayHighlight();

  if (isHighlighted(essayId)) {
    return 'ring-2 ring-green-400 ring-opacity-50 bg-green-50';
  }

  return '';
}
