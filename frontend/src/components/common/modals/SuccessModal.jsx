import BaseModal from './BaseModal';
import ModalHeader, { ModalFooter, ModalButton } from './ModalParts';

export default function SuccessModal({ isOpen, onClose, title = 'Operation successful', description, buttonText = 'Got it' }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#1E293B] shadow-xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
