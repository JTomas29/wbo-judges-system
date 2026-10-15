import BaseModal from './BaseModal';
import ModalHeader, { ModalFooter, ModalButton } from './ModalParts';

// ─── DeleteModal ────────────────────────────────────────────────────────────────
// Variante de BaseModal especializada para ELIMINAR entidades. Agrega a la base:
// cabecera con tipo "danger", descripción por defecto que nombra al item a borrar
// ("<itemName> will be deleted. This action cannot be undone."), banner de error
// opcional y pie con botón danger que muestra "Deleting..." mientras carga.
// Props adicionales: onConfirm, itemName, description, confirmLabel, loading y error.
// ───────────────────────────────────────────────────────────────────────────────

export default function DeleteModal({ isOpen, onClose, onConfirm, title = 'Delete', itemName, description, confirmLabel = 'Delete', loading = false, error }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-xl p-6">
        {/* Cabecera tipo danger; la descripción por defecto menciona el item y que es irreversible */}
        <ModalHeader
          title={title}
          description={description || (
            <>
              {itemName && <><strong className="text-slate-700 dark:text-[#F8FAFC]">{itemName}</strong> will be deleted.</>}
              {' '}This action cannot be undone.
            </>
          )}
          type="danger"
        />
        {/* Error de servidor (p. ej. restricción de integridad) mostrado sobre el pie */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-3 mb-2">
            <p className="text-sm text-red-700 dark:text-red-300 m-0">{error}</p>
          </div>
        )}
        {/* Acciones: cancelar siempre y confirmar en peligro/rojo */}
        <ModalFooter>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={onConfirm} loading={loading}>
            {loading ? 'Deleting...' : confirmLabel}
          </ModalButton>
        </ModalFooter>
      </div>
    </BaseModal>
  );
}
