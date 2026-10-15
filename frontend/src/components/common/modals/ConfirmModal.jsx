import BaseModal from './BaseModal';
import ModalHeader, { ModalFooter, ModalButton } from './ModalParts';

// ─── ConfirmModal ───────────────────────────────────────────────────────────────
// Variante de BaseModal para confirmaciones genéricas con dos acciones
// (Cancelar / Confirmar). Agrega a la base: cabecera (ModalHeader tipo warning)
// y pie con los dos botones. Usa la prop `danger` para pintar el botón de
// confirmación en rojo y `loading` para deshabilitar mientras se procesa.
// Props adicionales: onConfirm, confirmLabel, cancelLabel, type, danger y loading.
// ───────────────────────────────────────────────────────────────────────────────

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', type = 'warning', loading = false, danger = false }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-xl p-6">
        {/* Cabecera con ícono según `type` (por defecto warning) */}
        <ModalHeader title={title} description={description} type={type} />
        {/* Acciones: cancelar (secondary) y confirmar (primary o danger si aplica) */}
        <ModalFooter>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </ModalButton>
          <ModalButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </ModalButton>
        </ModalFooter>
      </div>
    </BaseModal>
  );
}
