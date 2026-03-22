import { useState, useEffect, useRef } from 'react';
import { FileText, Film, Music, File } from 'lucide-react';
import type { FileMeta } from '../storage/index';

interface FileGridProps {
  files: FileMeta[];
  onTap: (file: FileMeta) => void;
  onLongPress: (file: FileMeta) => void;
  readFile: (id: string, iv: string) => Promise<ArrayBuffer>;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('video/')) return <Film size={32} className="text-[#666]" />;
  if (mimeType.startsWith('audio/')) return <Music size={32} className="text-[#666]" />;
  if (mimeType.startsWith('text/') || mimeType === 'application/pdf')
    return <FileText size={32} className="text-[#666]" />;
  return <File size={32} className="text-[#666]" />;
}

function ImageThumbnail({
  file,
  readFile,
}: {
  file: FileMeta;
  readFile: (id: string, iv: string) => Promise<ArrayBuffer>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readFile(file.id, file.iv).then((buffer) => {
      if (cancelled) return;
      const blob = new Blob([buffer], { type: file.mimeType });
      const objectUrl = URL.createObjectURL(blob);
      urlRef.current = objectUrl;
      setUrl(objectUrl);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file.id, file.iv, file.mimeType, readFile]);

  if (!url) {
    return <div className="w-full h-full bg-[#222] animate-pulse" />;
  }

  return (
    <img
      src={url}
      alt={file.name}
      className="w-full h-full object-cover"
      loading="lazy"
    />
  );
}

export function FileGrid({ files, onTap, onLongPress, readFile }: FileGridProps) {
  const longPressTimer = useRef<number | null>(null);
  const didLongPress = useRef(false);

  const handleTouchStart = (file: FileMeta) => {
    didLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      didLongPress.current = true;
      onLongPress(file);
    }, 500);
  };

  const handleTouchEnd = (file: FileMeta) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!didLongPress.current) {
      onTap(file);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#555]">
        <File size={48} className="mb-4" />
        <p className="font-[Instrument_Sans] text-sm">No files yet</p>
        <p className="font-[Instrument_Sans] text-xs mt-1">Tap + to add files</p>
      </div>
    );
  }

  const imageFiles = files.filter((f) => f.mimeType.startsWith('image/'));
  const otherFiles = files.filter((f) => !f.mimeType.startsWith('image/'));

  return (
    <div>
      {imageFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-1 mb-4">
          {imageFiles.map((file) => (
            <div
              key={file.id}
              className="aspect-square rounded-lg overflow-hidden bg-[#1a1a1c] cursor-pointer"
              onTouchStart={() => handleTouchStart(file)}
              onTouchEnd={() => handleTouchEnd(file)}
              onTouchMove={handleTouchMove}
              onClick={() => onTap(file)}
            >
              <ImageThumbnail file={file} readFile={readFile} />
            </div>
          ))}
        </div>
      )}

      {otherFiles.length > 0 && (
        <div className="flex flex-col gap-1">
          {otherFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1c] active:bg-[#222]
                cursor-pointer min-h-[52px]"
              onTouchStart={() => handleTouchStart(file)}
              onTouchEnd={() => handleTouchEnd(file)}
              onTouchMove={handleTouchMove}
              onClick={() => onTap(file)}
            >
              <FileIcon mimeType={file.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-[Instrument_Sans] truncate">{file.name}</p>
                <p className="text-[#666] text-xs font-[DM_Mono]">
                  {formatSize(file.size)} · {new Date(file.dateAdded).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
