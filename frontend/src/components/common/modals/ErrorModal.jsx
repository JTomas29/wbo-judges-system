import BaseModal from './BaseModal';
import ModalHeader, { ModalFooter, ModalButton } from './ModalParts';

export default function ErrorModal({ isOpen, onClose, title = 'Error', description, buttonText = 'Cerrar' }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] mb-2 m-0">{title}</h3>
        {description && (
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-0 m-0">{description}</p>
        )}
        <div className="flex justify-center mt-6 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
          <ModalButton variant="primary" onClick={onClose}>
            {buttonText}
          </ModalButton>
        </div>
      </div>
    </BaseModal>
  );
}
