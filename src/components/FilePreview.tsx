import { useState, useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';
import type { FileMeta } from '../storage/index';

interface FilePreviewProps {
  file: FileMeta | null;
  onClose: () => void;
  readFile: (id: string, iv: string) => Promise<ArrayBuffer>;
  onExport: (file: FileMeta) => void;
}

export function FilePreview({ file, onClose, readFile, onExport }: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

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
    readFile(file.id, file.iv)
      .then((buffer) => {
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

  return (
    <div className="fixed inset-0 z-[100] bg-[#0e0e0f] flex flex-col">
      <div
        className="flex items-center justify-between p-4 bg-[#1a1a1c]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button
          onClick={onClose}
          className="text-[#a0a0a5] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X size={24} />
        </button>
        <h3 className="text-white font-[Instrument_Sans] text-sm truncate flex-1 text-center px-2">
          {file.name}
        </h3>
        <button
          onClick={() => onExport(file)}
          className="text-[#f5a623] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Download size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {loading ? (
          <div className="text-[#666] font-[Instrument_Sans]">Decrypting...</div>
        ) : file.mimeType.startsWith('image/') && url ? (
          <img
            src={url}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
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
          <pre className="text-white font-[DM_Mono] text-sm whitespace-pre-wrap w-full max-h-full overflow-auto p-4 bg-[#1a1a1c] rounded-xl">
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
      </div>
    </div>
  );
}
