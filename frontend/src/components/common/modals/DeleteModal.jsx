import BaseModal from './BaseModal';
import ModalHeader, { ModalFooter, ModalButton } from './ModalParts';

export default function DeleteModal({ isOpen, onClose, onConfirm, title = 'Eliminar', itemName, description, confirmLabel = 'Eliminar', loading = false, error }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-xl p-6">
        <ModalHeader
          title={title}
          description={description || (
            <>
              {itemName && <><strong className="text-slate-700 dark:text-[#F8FAFC]">{itemName}</strong> será eliminado/a.</>}
              {' '}Esta acción no se puede deshacer.
            </>
          )}
          type="danger"
        />
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-3 mb-2">
            <p className="text-sm text-red-700 dark:text-red-300 m-0">{error}</p>
          </div>
        )}
        <ModalFooter>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </ModalButton>
          <ModalButton variant="danger" onClick={onConfirm} loading={loading}>
            {loading ? 'Eliminando...' : confirmLabel}
          </ModalButton>
        </ModalFooter>
      </div>
    </BaseModal>
  );
}
