import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmGuestSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmGuestSignInModal: React.FC<ConfirmGuestSignInModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus "Cancelar" by default for accessibility & preventing accidental data discard
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-signin-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#FFFBD9] dark:bg-[#1A261A] text-[#546C37] dark:text-[#CFE3A8] font-['Space_Grotesk'] rounded-3xl p-6 border-2 border-[#ADCA88] dark:border-[#3C5A40] shadow-2xl transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FA8989]/30 dark:bg-[#941C2F]/30 border border-[#FA8989] dark:border-[#FF9FAE]/40 flex items-center justify-center text-[#941C2F] dark:text-[#FF9FAE] shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3
            id="confirm-signin-title"
            className="text-base font-bold text-[#3A4D25] dark:text-[#E2F1C8] leading-tight"
          >
            Iniciar sesión con Google
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-[#546C37]/90 dark:text-[#CFE3A8]/90 leading-relaxed mb-6">
          Si inicias sesión, la conversación actual se descartará y no se guardará. ¿Continuar?
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-[#ADCA88] dark:border-[#3C5A40] text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1]/40 dark:hover:bg-[#24402B]/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#546C37] dark:focus:ring-[#CFE3A8]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#546C37] hover:bg-[#485D2F] dark:bg-[#6E8F47] dark:hover:bg-[#7FA255] text-[#FFFBD9] shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#546C37]"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
