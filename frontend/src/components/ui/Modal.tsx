import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  descriptionId?: string;
  className?: string;
};

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modal({ open, onClose, children, labelledBy, descriptionId, className }: ModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousOverflow = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    if (typeof document !== 'undefined' && document.body) {
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const focusTimeout = window.setTimeout(() => {
      const node = containerRef.current;
      if (!node) return;
      const focusable = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        node.focus();
      }
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimeout);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = previousOverflow.current ?? '';
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = () => {
    onClose();
  };

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const dialogClassName = ['w-full max-w-xl rounded-2xl bg-white shadow-xl focus:outline-none', className]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div className="fixed inset-0 z-[1000]" role="presentation">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleOverlayClick}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={descriptionId}
          className={dialogClassName}
          tabIndex={-1}
          onClick={handleContentClick}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
