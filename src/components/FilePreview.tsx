import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FileMeta } from '../storage/index';

interface FilePreviewProps {
  file: FileMeta | null;
  allFiles: FileMeta[];
  onClose: () => void;
  onNavigate: (file: FileMeta) => void;
  readFile: (id: string, iv: string) => Promise<ArrayBuffer>;
  onExport: (file: FileMeta) => void;
}

export function FilePreview({ file, allFiles, onClose, onNavigate, readFile, onExport }: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

  // Swipe state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const swiping = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Get sibling images for swiping
  const imageFiles = allFiles.filter((f) => f.mimeType.startsWith('image/'));
  const isImage = file?.mimeType.startsWith('image/');
  const currentIndex = isImage && file ? imageFiles.findIndex((f) => f.id === file.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < imageFiles.length - 1;

  const goTo = useCallback((direction: 'prev' | 'next') => {
    if (currentIndex < 0) return;
    const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= imageFiles.length) return;

    // Animate out
    setTransitioning(true);
    setSwipeOffset(direction === 'prev' ? window.innerWidth : -window.innerWidth);

    setTimeout(() => {
      onNavigate(imageFiles[nextIndex]);
      setSwipeOffset(0);
      setTransitioning(false);
    }, 150);
  }, [currentIndex, imageFiles, onNavigate]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isImage) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    swiping.current = false;
  }, [isImage]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isImage) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Determine if horizontal swipe
    if (!swiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swiping.current = true;
    }

    if (swiping.current) {
      e.preventDefault();
      touchDeltaX.current = dx;
      // Add resistance at edges
      if ((!hasPrev && dx > 0) || (!hasNext && dx < 0)) {
        setSwipeOffset(dx * 0.3);
      } else {
        setSwipeOffset(dx);
      }
    }
  }, [isImage, hasPrev, hasNext]);

  const handleTouchEnd = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    const dx = touchDeltaX.current;
    const threshold = window.innerWidth * 0.25;

    if (dx < -threshold && hasNext) {
      goTo('next');
    } else if (dx > threshold && hasPrev) {
      goTo('prev');
    } else {
      // Snap back
      setTransitioning(true);
      setSwipeOffset(0);
      setTimeout(() => setTransitioning(false), 150);
    }
  }, [hasNext, hasPrev, goTo]);

  useEffect(() => {
    if (!file) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setUrl(null);
      setTextContent(null);
      return;
    }

    setLoading(true);
    setUrl(null);
    setTextContent(null);

    readFile(file.id, file.iv)
      .then((buffer) => {
        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
          urlRef.current = null;
        }
        if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json') {
          const text = new TextDecoder().decode(buffer);
          setTextContent(text);
        } else {
          const blob = new Blob([buffer], { type: file.mimeType });
          const objectUrl = URL.createObjectURL(blob);
          urlRef.current = objectUrl;
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        setTextContent('Failed to decrypt file.');
      })
      .finally(() => setLoading(false));

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file, readFile]);

  if (!file) return null;

  const counter = currentIndex >= 0
    ? `${currentIndex + 1} / ${imageFiles.length}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e0e0f] flex flex-col">
      <div
        className="flex items-center justify-between p-4 bg-[#1a1a1c] relative z-10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button
          onClick={onClose}
          className="text-[#a0a0a5] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X size={24} />
        </button>
        <div className="flex flex-col items-center flex-1 px-2">
          <h3 className="text-white font-[Instrument_Sans] text-sm truncate max-w-[200px]">
            {file.name}
          </h3>
          {counter && (
            <span className="text-[#666] font-[DM_Mono] text-xs">{counter}</span>
          )}
        </div>
        <button
          onClick={() => onExport(file)}
          className="text-[#f5a623] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Download size={22} />
        </button>
      </div>

      <div
        className="flex-1 overflow-hidden flex items-center justify-center relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <div className="text-[#666] font-[Instrument_Sans]">Decrypting...</div>
        ) : file.mimeType.startsWith('image/') && url ? (
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{
              transform: `translateX(${swipeOffset}px)`,
              transition: transitioning ? 'transform 150ms ease-out' : 'none',
            }}
          >
            <img
              src={url}
              alt={file.name}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          </div>
        ) : file.mimeType === 'application/pdf' && url ? (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={file.name}
          />
        ) : file.mimeType.startsWith('video/') && url ? (
          <video src={url} controls className="max-w-full max-h-full" />
        ) : file.mimeType.startsWith('audio/') && url ? (
          <audio src={url} controls className="w-full" />
        ) : textContent !== null ? (
          <pre className="text-white font-[DM_Mono] text-sm whitespace-pre-wrap w-full max-h-full overflow-auto p-4 bg-[#1a1a1c] rounded-xl m-4">
            {textContent}
          </pre>
        ) : (
          <div className="text-[#666] font-[Instrument_Sans] text-center">
            <p>Preview not available</p>
            <button
              onClick={() => onExport(file)}
              className="mt-4 text-[#f5a623] underline"
            >
              Export to view
            </button>
          </div>
        )}

        {/* Nav arrows (visible on non-touch devices / as tap targets on edges) */}
        {isImage && hasPrev && (
          <button
            onClick={() => goTo('prev')}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
              bg-black/40 flex items-center justify-center text-white/70 active:text-white"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {isImage && hasNext && (
          <button
            onClick={() => goTo('next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
              bg-black/40 flex items-center justify-center text-white/70 active:text-white"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
