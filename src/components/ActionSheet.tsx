import { useEffect } from 'react';
import { Image, FileUp, StickyNote, X } from 'lucide-react';

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  onAddPhotos: () => void;
  onAddFiles: () => void;
  onNewNote: () => void;
}

export function ActionSheet({ open, onClose, onAddPhotos, onAddFiles, onNewNote }: ActionSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const actions = [
    { label: 'Add Photos', icon: Image, onClick: onAddPhotos },
    { label: 'Add Files', icon: FileUp, onClick: onAddFiles },
    { label: 'New Note', icon: StickyNote, onClick: onNewNote },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[400px] bg-[#1a1a1c] rounded-t-2xl p-4 pb-8
        animate-slideUp"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-[Instrument_Sans] font-semibold text-lg">Add to Vault</h3>
          <button onClick={onClose} className="text-[#666] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {actions.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              onClick={() => { onClick(); onClose(); }}
              className="flex items-center gap-4 p-4 rounded-xl bg-[#222224] active:bg-[#333]
                text-white font-[Instrument_Sans] min-h-[52px] transition-colors"
            >
              <Icon size={22} className="text-[#f5a623]" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
