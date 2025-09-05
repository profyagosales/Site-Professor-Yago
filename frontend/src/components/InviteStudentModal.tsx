/**
 * Modal para convite de estudante por e-mail
 * 
 * Funcionalidades:
 * - Validação de e-mail
 * - Cópia automática de URL para clipboard
 * - Estados de loading e erro
 * - Acessibilidade integrada
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

export interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<string | null>;
  isLoading?: boolean;
  className?: string;
}

export default function InviteStudentModal({
  isOpen,
  onClose,
  onInvite,
  isLoading = false,
  className = '',
}: InviteStudentModalProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isOpen]);

  // Limpar formulário quando fechar
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const validateEmail = (email: string): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'E-mail inválido';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) return;
    
    const validationErrors = validateEmail(email);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const inviteUrl = await onInvite(email.trim());
      
      if (inviteUrl) {
        // Copiar URL para clipboard
        try {
          await navigator.clipboard.writeText(inviteUrl);
          toast.success('Link de convite copiado para a área de transferência!');
        } catch (clipboardError) {
          // Fallback: mostrar URL em um prompt
          const userConfirmed = window.confirm(
            `Link de convite gerado:\n\n${inviteUrl}\n\nDeseja copiar manualmente?`
          );
          
          if (userConfirmed) {
            // Tentar selecionar o texto para facilitar a cópia
            const textArea = document.createElement('textarea');
            textArea.value = inviteUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('Link de convite copiado!');
          }
        }
        
        onClose();
      }
    } catch (error) {
      // Erro será tratado pelo componente pai
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Limpar erro quando usuário começar a digitar
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  if (!isOpen) return null;

  const isDisabled = isSubmitting || isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        aria-describedby="invite-description"
      >
        <div className="flex items-center mb-4">
          <div className="text-2xl text-blue-600 mr-3">
            📧
          </div>
          <div>
            <h3
              id="invite-title"
              className="text-lg font-semibold text-gray-900"
            >
              Convidar Estudante
            </h3>
            <p
              id="invite-description"
              className="text-sm text-gray-600"
            >
              Envie um link de convite por e-mail
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail do estudante
            </label>
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={isDisabled}
              placeholder="exemplo@email.com"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <div className="text-blue-600 mr-2">ℹ️</div>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Como funciona:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• O estudante receberá um e-mail com o link</li>
                  <li>• O link será copiado automaticamente</li>
                  <li>• O convite expira em 7 dias</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isDisabled}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isDisabled}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisabled ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </div>
              ) : (
                'Enviar Convite'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
