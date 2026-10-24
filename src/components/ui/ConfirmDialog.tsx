import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-base/80 backdrop-blur-md p-4 animate-fade-in font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-surface border border-subtle-line rounded-card shadow-card-hover overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent-primary to-transparent" />

        <div className="p-6 pb-4 flex items-start justify-between gap-3 border-b border-subtle-line">
          <h3 id="confirm-dialog-title" className="text-lg font-bold tracking-[-0.02em] text-fg">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="shrink-0 rounded-btn p-1.5 text-faint hover:bg-surface-hover hover:text-fg transition-colors"
            aria-label="Close dialog"
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        <p id="confirm-dialog-message" className="px-6 py-4 text-sm leading-relaxed text-subtle">
          {message}
        </p>

        <div className="flex items-center gap-3 border-t border-subtle-line p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-btn border border-subtle-line bg-surface-hover px-4 py-3 text-xs font-bold uppercase tracking-widest text-subtle transition-colors hover:border-accent-primary/40 hover:text-fg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 rounded-btn px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${
              danger
                ? "border border-accent-danger/50 bg-accent-danger/20 text-accent-danger hover:bg-accent-danger"
                : "border border-accent-primary/50 bg-accent-primary/20 text-accent-primary hover:bg-accent-primary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
