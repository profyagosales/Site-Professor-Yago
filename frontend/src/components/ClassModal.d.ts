declare module '@/components/ClassModal' {
  import type { ComponentType } from 'react';

  const ClassModal: ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: any) => void | Promise<void>;
    initialData?: any;
  }>;

  export default ClassModal;
}
