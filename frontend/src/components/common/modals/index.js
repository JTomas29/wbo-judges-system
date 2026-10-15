// ─── modals / index ─────────────────────────────────────────────────────────────
// Barril (barrel file) de exportación de todos los modales y sus piezas.
// Centraliza los imports para que las pantallas hagan:
//   import { ConfirmModal, DeleteModal, SuccessModal, ... } from '.../modals';
// ───────────────────────────────────────────────────────────────────────────────

// Variantes de modal (todas construidas sobre BaseModal)
export { default as BaseModal } from './BaseModal';
export { default as ConfirmModal } from './ConfirmModal';
export { default as DeleteModal } from './DeleteModal';
// Piezas reutilizables de construcción de modales
export { default as ModalHeader } from './ModalParts';
export { ModalFooter, ModalButton } from './ModalParts';
