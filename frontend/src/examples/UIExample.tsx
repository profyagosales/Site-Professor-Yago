import React from 'react';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { useUI } from '@/providers/UIProvider';
import Modal from '@/components/ui/modal';

export default function UIExample() {
  const toast = useToast();
  const confirm = useConfirm();
  const { showModal, hideModal } = useUI();

  const handleShowModal = () => {
    const modalId = showModal(
      <Modal
        isOpen={true}
        onClose={() => hideModal(modalId)}
        title='Exemplo de Modal'
        size='md'
      >
        <div className='space-y-4'>
          <p>Este é um exemplo de modal usando o UIProvider.</p>
          <div className='flex justify-end'>
            <button
              onClick={() => hideModal(modalId)}
              className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700'
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const handleConfirm = async () => {
    const result = await confirm({
      title: 'Confirmar ação',
      message: 'Tem certeza que deseja continuar?',
      type: 'warning',
      confirmText: 'Sim, continuar',
      cancelText: 'Cancelar',
    });

    if (result) {
      toast.success('Ação confirmada!');
    } else {
      toast.info('Ação cancelada');
    }
  };

  return (
    <div className='p-6 space-y-4'>
      <h2 className='text-2xl font-bold'>Exemplos de UI Components</h2>

      <div className='space-y-2'>
        <h3 className='text-lg font-semibold'>Toasts</h3>
        <div className='flex space-x-2'>
          <button
            onClick={() => toast.success('Sucesso!')}
            className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700'
          >
            Success Toast
          </button>
          <button
            onClick={() => toast.error('Erro!')}
            className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
          >
            Error Toast
          </button>
          <button
            onClick={() => toast.warning('Atenção!')}
            className='px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700'
          >
            Warning Toast
          </button>
          <button
            onClick={() => toast.info('Informação!')}
            className='px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700'
          >
            Info Toast
          </button>
        </div>
      </div>

      <div className='space-y-2'>
        <h3 className='text-lg font-semibold'>Modais</h3>
        <div className='flex space-x-2'>
          <button
            onClick={handleShowModal}
            className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
          >
            Mostrar Modal
          </button>
          <button
            onClick={handleConfirm}
            className='px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700'
          >
            Modal de Confirmação
          </button>
        </div>
      </div>
    </div>
  );
}
