import { useUI } from '@/providers/UIProvider';
import ConfirmModal from '@/components/ui/confirm-modal.tsx';
import { useState } from 'react';
import React from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function useConfirm() {
  const { showModal, hideModal } = useUI();
  const [loading, setLoading] = useState(false);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      const modalId = showModal(
        <ConfirmModal
          isOpen={true}
          onClose={() => {
            hideModal(modalId);
            resolve(false);
          }}
          onConfirm={async () => {
            setLoading(true);
            try {
              resolve(true);
            } finally {
              setLoading(false);
              hideModal(modalId);
            }
          }}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          type={options.type}
          loading={loading}
        />
      );
    });
  };

  return { confirm };
}
