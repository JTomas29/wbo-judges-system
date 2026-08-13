import BaseModal from './BaseModal';
import ModalHeader, { ModalFooter, ModalButton } from './ModalParts';

export default function WarningModal({ isOpen, onClose, onConfirm, title = 'Warning', description, confirmLabel = 'Continue', cancelLabel = 'Cancel', loading = false }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-xl p-6">
        <ModalHeader title={title} description={description} type="warning" />
        <ModalFooter>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </ModalButton>
          <ModalButton variant="primary" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </ModalButton>
        </ModalFooter>
      </div>
    </BaseModal>
  );
}
