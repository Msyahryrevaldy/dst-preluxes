import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface ConfirmDriveModalProps {
  open: boolean;
  title: string;
  description: string;
  targetFolderLabel: string;
  affectedFiles: string[];
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDriveModal: React.FC<ConfirmDriveModalProps> = ({
  open,
  title,
  description,
  targetFolderLabel,
  affectedFiles,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1B3D]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-confirm-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#DDE3F2] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#05349B]/10 text-[#05349B]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 id="drive-confirm-title" className="text-base font-bold text-[#0F1B3D]">
                {title}
              </h3>
              <p className="text-xs text-slate-500">Google Drive Mutation Guard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={cancelLabel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-700">{description}</p>

        <div className="mt-4 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3.5 text-xs">
          <div className="font-semibold text-[#0F1B3D]">Folder Tujuan: {targetFolderLabel}</div>
          {affectedFiles.length > 0 && (
            <ul className="mt-2 space-y-1 text-slate-600">
              {affectedFiles.map((file, idx) => (
                <li key={idx} className="truncate font-mono">
                  • {file}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#DDE3F2] bg-white px-4 py-2 text-sm font-semibold text-[#0F1B3D] hover:bg-slate-50 whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#05349B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#042878] whitespace-nowrap"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
