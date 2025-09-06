import * as React from 'react';

type ModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  className,
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className={`fixed inset-0 z-50 ${className ?? ''}`}>
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto mt-10 w-[min(96vw,720px)] rounded-xl bg-white p-4 shadow-lg">
        {title ? <h2 className="mb-1 text-lg font-semibold">{title}</h2> : null}
        {description ? <p className="mb-3 text-sm text-gray-600">{description}</p> : null}
        <div>{children}</div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}

// ✅ compatibilidade: permite importar como named OU default
export default Modal;