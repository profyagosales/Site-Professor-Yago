import React, { useState, useEffect } from 'react';
import {
  getFlag,
  setFlag,
  getAllFlags,
  resetFlags,
  FeatureFlags,
} from '@/flags';
import { logger } from '@/lib/logger';

interface FlagsDebugProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlagsDebug({ isOpen, onClose }: FlagsDebugProps) {
  const [flags, setFlags] = useState<FeatureFlags>(getAllFlags());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFlags(getAllFlags());
      logger.info('Flags debug panel opened', {
        component: 'FlagsDebug',
        action: 'open',
        flags: flags,
      });
    }
  }, [isOpen]);

  const handleFlagChange = (name: keyof FeatureFlags, value: boolean) => {
    setLoading(true);
    setFlag(name, value);
    setFlags(prev => ({ ...prev, [name]: value }));

    logger.info(`Flag ${name} changed to ${value}`, {
      component: 'FlagsDebug',
      action: 'flagChange',
      flag: name,
      value: value,
    });

    // Simular delay para mostrar loading
    setTimeout(() => setLoading(false), 200);
  };

  const handleReset = () => {
    setLoading(true);
    resetFlags();
    setFlags(getAllFlags());

    logger.info('All flags reset to defaults', {
      component: 'FlagsDebug',
      action: 'reset',
    });

    setTimeout(() => setLoading(false), 200);
  };

  const handleClose = () => {
    logger.info('Flags debug panel closed', {
      component: 'FlagsDebug',
      action: 'close',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto'>
        <div className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-bold text-ys-ink'>Feature Flags</h2>
            <button
              onClick={handleClose}
              className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              aria-label='Fechar painel de flags'
            >
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          <div className='space-y-4'>
            <div className='text-sm text-ys-ink-2 mb-4'>
              Alterar flags reflete instantaneamente na interface. Use com
              cuidado em produção.
            </div>

            {/* PDF Inline Viewer */}
            <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
              <div>
                <div className='font-medium text-ys-ink'>PDF Inline Viewer</div>
                <div className='text-sm text-ys-ink-2'>
                  {flags.pdf_inline_viewer
                    ? 'Viewer integrado ativo'
                    : 'Fallback para nova aba'}
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={flags.pdf_inline_viewer}
                  onChange={e =>
                    handleFlagChange('pdf_inline_viewer', e.target.checked)
                  }
                  className='sr-only peer'
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ys-amber/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ys-amber"></div>
              </label>
            </div>

            {/* Annotations Enabled */}
            <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
              <div>
                <div className='font-medium text-ys-ink'>Anotações</div>
                <div className='text-sm text-ys-ink-2'>
                  {flags.annotations_enabled
                    ? 'Sistema de anotações ativo'
                    : 'Anotações desabilitadas'}
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={flags.annotations_enabled}
                  onChange={e =>
                    handleFlagChange('annotations_enabled', e.target.checked)
                  }
                  className='sr-only peer'
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ys-amber/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ys-amber"></div>
              </label>
            </div>

            {/* New Menu Styles */}
            <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
              <div>
                <div className='font-medium text-ys-ink'>
                  Novos Estilos de Menu
                </div>
                <div className='text-sm text-ys-ink-2'>
                  {flags.new_menu_styles
                    ? 'Design atual ativo'
                    : 'Design antigo ativo'}
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={flags.new_menu_styles}
                  onChange={e =>
                    handleFlagChange('new_menu_styles', e.target.checked)
                  }
                  className='sr-only peer'
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ys-amber/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ys-amber"></div>
              </label>
            </div>
          </div>

          <div className='flex gap-3 mt-6'>
            <button
              onClick={handleReset}
              className='flex-1 px-4 py-2 text-sm font-medium text-ys-ink-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
              disabled={loading}
            >
              Resetar Padrões
            </button>
            <button
              onClick={handleClose}
              className='flex-1 px-4 py-2 text-sm font-medium text-white bg-ys-amber hover:bg-ys-amber-light rounded-lg transition-colors'
              disabled={loading}
            >
              Fechar
            </button>
          </div>

          {loading && (
            <div className='mt-4 text-center'>
              <div className='inline-flex items-center text-sm text-ys-ink-2'>
                <svg
                  className='animate-spin -ml-1 mr-2 h-4 w-4 text-ys-amber'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
                Aplicando mudanças...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook para gerenciar o estado do modal
export function useFlagsDebug() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return { isOpen, open, close, toggle };
}

import {
  getFlag,
  setFlag,
  getAllFlags,
  resetFlags,
  FeatureFlags,
} from '@/flags';
import { logger } from '@/lib/logger';

interface FlagsDebugProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FlagsDebug({ isOpen, onClose }: FlagsDebugProps) {
  const [flags, setFlags] = useState<FeatureFlags>(getAllFlags());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFlags(getAllFlags());
      logger.info('Flags debug panel opened', {
        component: 'FlagsDebug',
        action: 'open',
        flags: flags,
      });
    }
  }, [isOpen]);

  const handleFlagChange = (name: keyof FeatureFlags, value: boolean) => {
    setLoading(true);
    setFlag(name, value);
    setFlags(prev => ({ ...prev, [name]: value }));

    logger.info(`Flag ${name} changed to ${value}`, {
      component: 'FlagsDebug',
      action: 'flagChange',
      flag: name,
      value: value,
    });

    // Simular delay para mostrar loading
    setTimeout(() => setLoading(false), 200);
  };

  const handleReset = () => {
    setLoading(true);
    resetFlags();
    setFlags(getAllFlags());

    logger.info('All flags reset to defaults', {
      component: 'FlagsDebug',
      action: 'reset',
    });

    setTimeout(() => setLoading(false), 200);
  };

  const handleClose = () => {
    logger.info('Flags debug panel closed', {
      component: 'FlagsDebug',
      action: 'close',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto'>
        <div className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-bold text-ys-ink'>Feature Flags</h2>
            <button
              onClick={handleClose}
              className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              aria-label='Fechar painel de flags'
            >
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          <div className='space-y-4'>
            <div className='text-sm text-ys-ink-2 mb-4'>
              Alterar flags reflete instantaneamente na interface. Use com
              cuidado em produção.
            </div>

            {/* PDF Inline Viewer */}
            <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
              <div>
                <div className='font-medium text-ys-ink'>PDF Inline Viewer</div>
                <div className='text-sm text-ys-ink-2'>
                  {flags.pdf_inline_viewer
                    ? 'Viewer integrado ativo'
                    : 'Fallback para nova aba'}
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={flags.pdf_inline_viewer}
                  onChange={e =>
                    handleFlagChange('pdf_inline_viewer', e.target.checked)
                  }
                  className='sr-only peer'
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ys-amber/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ys-amber"></div>
              </label>
            </div>

            {/* Annotations Enabled */}
            <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
              <div>
                <div className='font-medium text-ys-ink'>Anotações</div>
                <div className='text-sm text-ys-ink-2'>
                  {flags.annotations_enabled
                    ? 'Sistema de anotações ativo'
                    : 'Anotações desabilitadas'}
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={flags.annotations_enabled}
                  onChange={e =>
                    handleFlagChange('annotations_enabled', e.target.checked)
                  }
                  className='sr-only peer'
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ys-amber/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ys-amber"></div>
              </label>
            </div>

            {/* New Menu Styles */}
            <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
              <div>
                <div className='font-medium text-ys-ink'>
                  Novos Estilos de Menu
                </div>
                <div className='text-sm text-ys-ink-2'>
                  {flags.new_menu_styles
                    ? 'Design atual ativo'
                    : 'Design antigo ativo'}
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={flags.new_menu_styles}
                  onChange={e =>
                    handleFlagChange('new_menu_styles', e.target.checked)
                  }
                  className='sr-only peer'
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ys-amber/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ys-amber"></div>
              </label>
            </div>
          </div>

          <div className='flex gap-3 mt-6'>
            <button
              onClick={handleReset}
              className='flex-1 px-4 py-2 text-sm font-medium text-ys-ink-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
              disabled={loading}
            >
              Resetar Padrões
            </button>
            <button
              onClick={handleClose}
              className='flex-1 px-4 py-2 text-sm font-medium text-white bg-ys-amber hover:bg-ys-amber-light rounded-lg transition-colors'
              disabled={loading}
            >
              Fechar
            </button>
          </div>

          {loading && (
            <div className='mt-4 text-center'>
              <div className='inline-flex items-center text-sm text-ys-ink-2'>
                <svg
                  className='animate-spin -ml-1 mr-2 h-4 w-4 text-ys-amber'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
                Aplicando mudanças...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook para gerenciar o estado do modal
export function useFlagsDebug() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return { isOpen, open, close, toggle };
}
