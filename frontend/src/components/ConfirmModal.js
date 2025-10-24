/**
 * ConfirmModal Component
 * 
 * Reusable confirmation dialog for user actions that need confirmation.
 * Displays a modal overlay with title, message, and confirm/cancel buttons.
 * 
 * Features:
 * - Click outside modal to cancel (overlay click)
 * - Prevents click propagation from modal content
 * - Smooth fade-in and slide-up animations
 * - Responsive design for mobile/desktop
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {string} props.title - Modal header text
 * @param {string} props.message - Modal body message
 * @param {Function} props.onConfirm - Callback when user confirms
 * @param {Function} props.onCancel - Callback when user cancels or clicks outside
 * 
 * @example
 * const [showModal, setShowModal] = useState(false);
 * 
 * <ConfirmModal
 *   isOpen={showModal}
 *   title="Xác nhận đăng xuất"
 *   message="Bạn có chắc chắn muốn đăng xuất?"
 *   onConfirm={() => { handleLogout(); setShowModal(false); }}
 *   onCancel={() => setShowModal(false)}
 * />
 */

import React from 'react';
import './ConfirmModal.css';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    // Overlay - clicking it triggers onCancel
    <div className="modal-overlay" onClick={onCancel}>
      {/* Modal content - stop click propagation to prevent closing when clicking inside modal */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            Hủy
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
