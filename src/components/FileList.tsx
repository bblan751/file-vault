import { useRef, useState } from 'react';
import { FileText, Film, Music, File, Trash2 } from 'lucide-react';
import type { FileMeta } from '../storage/index';

interface FileListProps {
  files: FileMeta[];
  onTap: (file: FileMeta) => void;
  onLongPress: (file: FileMeta) => void;
  onDelete: (file: FileMeta) => void;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <File size={20} className="text-[#f5a623]" />;
  if (mimeType.startsWith('video/')) return <Film size={20} className="text-[#666]" />;
  if (mimeType.startsWith('audio/')) return <Music size={20} className="text-[#666]" />;
  if (mimeType.startsWith('text/') || mimeType === 'application/pdf')
    return <FileText size={20} className="text-[#666]" />;
  return <File size={20} className="text-[#666]" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SwipeableItem({
  file,
  onTap,
  onLongPress,
  onDelete,
}: {
  file: FileMeta;
  onTap: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const didLongPress = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
    didLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swiping.current = true;
      setOffset(Math.min(0, dx));
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (swiping.current) {
      if (offset < -80) {
        setOffset(-80);
      } else {
        setOffset(0);
      }
      swiping.current = false;
    } else if (!didLongPress.current) {
      onTap();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute right-0 top-0 bottom-0 w-[80px] bg-red-500 flex items-center justify-center"
        onClick={onDelete}
      >
        <Trash2 size={20} className="text-white" />
      </div>
      <div
        className="relative flex items-center gap-3 p-3 bg-[#1a1a1c] active:bg-[#222]
          min-h-[52px] transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <FileIcon mimeType={file.mimeType} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-[Instrument_Sans] truncate">{file.name}</p>
          <p className="text-[#666] text-xs font-[DM_Mono]">
            {formatSize(file.size)} · {new Date(file.dateAdded).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FileList({ files, onTap, onLongPress, onDelete }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#555]">
        <File size={48} className="mb-4" />
        <p className="font-[Instrument_Sans] text-sm">No files yet</p>
        <p className="font-[Instrument_Sans] text-xs mt-1">Tap + to add files</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {files.map((file) => (
        <SwipeableItem
          key={file.id}
          file={file}
          onTap={() => onTap(file)}
          onLongPress={() => onLongPress(file)}
          onDelete={() => onDelete(file)}
        />
      ))}
    </div>
  );
}
