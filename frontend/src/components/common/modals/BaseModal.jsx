import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ─── BaseModal (variante común de todos los modales) ────────────────────────────
// Modal genérico que TODAS las variantes (ConfirmModal, DeleteModal, ErrorModal,
// SuccessModal, WarningModal) reutilizan. Provee:
//   - Renderizado mediante createPortal sobre document.body.
//   - Overlay oscuro con blur + cierre al hacer clic sobre el fondo.
//   - Cierre con tecla Escape y bloqueo del scroll del body mientras está abierto.
//   - Rol ARIA dialog + aria-modal, ancho configurable y scroll interno vertical.
// Las subclases sólo añaden su contenido (children) y su propia cabecera/acciones.
// ───────────────────────────────────────────────────────────────────────────────

// Props: isOpen (¿visible?), onClose (cancelar), maxWidth (ancho del panel),
// zIndex (z del overlay) y children (contenido específico de cada variante)
export default function BaseModal({ isOpen, onClose, maxWidth = 'max-w-md', children, zIndex = 'z-50' }) {
  // Ref al overlay para distinguir clic "fuera" (fondoverlay) del clic sobre el panel
  const overlayRef = useRef(null);

  // Efecto de ciclo de vida: mientras está abierto, captura Escape y bloquea scroll
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

  // Si no está abierto, no renderiza nada
  if (!isOpen) return null;

  // Teleport del modal al body con overlay, capa de fondo y panel con scroll
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
