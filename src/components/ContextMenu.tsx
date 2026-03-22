import { useEffect } from 'react';
import { Eye, Download, PenLine, FolderInput, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  open: boolean;
  onClose: () => void;
  onPreview: () => void;
  onExport: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  position?: { x: number; y: number };
}

export function ContextMenu({
  open,
  onClose,
  onPreview,
  onExport,
  onRename,
  onMove,
  onDelete,
}: ContextMenuProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const items = [
    { label: 'Preview', icon: Eye, onClick: onPreview },
    { label: 'Export', icon: Download, onClick: onExport },
    { label: 'Rename', icon: PenLine, onClick: onRename },
    { label: 'Move to Folder', icon: FolderInput, onClick: onMove },
    { label: 'Delete', icon: Trash2, onClick: onDelete, danger: true },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[400px] bg-[#1a1a1c] rounded-t-2xl p-4 pb-8 animate-slideUp"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
      >
        <div className="w-10 h-1 bg-[#444] rounded-full mx-auto mb-4" />
        <div className="flex flex-col gap-1">
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              onClick={() => { onClick(); onClose(); }}
              className={`flex items-center gap-4 p-4 rounded-xl active:bg-[#333]
                font-[Instrument_Sans] min-h-[48px] transition-colors ${
                  danger ? 'text-red-400' : 'text-white'
                }`}
            >
              <Icon size={20} className={danger ? 'text-red-400' : 'text-[#888]'} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
