import React, { useState } from 'react';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

export default function UnsavedChangesExample() {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  // Hook para proteção de mudanças não salvas
  const { clearChanges } = useUnsavedChanges({
    hasChanges: text.trim() !== '' && !saved,
    message: 'Você tem texto não salvo. Tem certeza que deseja sair?',
  });

  const handleSave = () => {
    // Simular salvamento
    setSaved(true);
    clearChanges();
    alert('Texto salvo!');
  };

  const handleReset = () => {
    setText('');
    setSaved(false);
  };

  return (
    <div className='p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg'>
      <h2 className='text-xl font-semibold mb-4'>
        Exemplo de Proteção de Mudanças
      </h2>

      <div className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Digite algo aqui:
          </label>
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value);
              setSaved(false);
            }}
            className='w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
            rows={4}
            placeholder='Digite algo e tente navegar para outra página...'
          />
        </div>

        <div className='flex space-x-2'>
          <button
            onClick={handleSave}
            disabled={text.trim() === '' || saved}
            className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {saved ? 'Salvo' : 'Salvar'}
          </button>

          <button
            onClick={handleReset}
            className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700'
          >
            Limpar
          </button>
        </div>

        <div className='text-sm text-gray-600'>
          <p>Status: {saved ? '✅ Salvo' : '⚠️ Não salvo'}</p>
          <p className='mt-1'>
            Tente navegar para outra página ou fechar a aba para ver a proteção
            em ação.
          </p>
        </div>
      </div>
    </div>
  );
}
