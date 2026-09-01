import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function BaseModal({ isOpen, onClose, maxWidth = 'max-w-md', children, zIndex = 'z-50' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
      <div
        ref={overlayRef}
        className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]`}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity" />
        <div
          role="dialog"
          aria-modal="true"
          className={`relative w-full ${maxWidth} max-h-[85vh] overflow-y-auto animate-[scaleIn_0.2s_ease-out]`}
        >
          {children}
        </div>
      </div>,
    document.body
  );
}
