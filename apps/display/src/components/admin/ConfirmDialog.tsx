"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  message: ReactNode;
  /** Complément affiché en encadré : conséquence irréversible, etc. */
  warning?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation d'action destructive.
 *
 * Remplace `window.confirm`, dont l'apparence système jure avec l'interface et
 * qui ne permet ni mise en forme ni hiérarchie de l'information.
 */
export function ConfirmDialog({
  title,
  message,
  warning,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Le focus part sur « Annuler » : sur une action destructive, la touche
  // Entrée ne doit pas déclencher la suppression par réflexe.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-panel-border bg-ink p-7"
        // Un clic dans la boîte ne doit pas la fermer.
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-[17px] font-extrabold">
          {title}
        </h2>

        <div className="mt-2 text-[13px] leading-relaxed text-muted">
          {message}
        </div>

        {warning && (
          <div className="mt-4 flex gap-2.5 rounded-xl border border-brand-amber/30 bg-brand-amber/10 px-4 py-3">
            <span aria-hidden className="text-[13px]">
              ⚠️
            </span>
            <p className="text-[12px] leading-relaxed text-brand-amber">
              {warning}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-panel-border px-5 py-2.5 text-[13px] font-semibold transition hover:bg-white/5"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-brand-pink px-6 py-2.5 text-[13px] font-bold text-white transition hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
