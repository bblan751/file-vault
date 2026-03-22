import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Eye, Edit3, Bold, Italic, Heading, List, Link } from 'lucide-react';

interface NoteEditorProps {
  initialContent: string;
  title: string;
  onSave: (content: string) => void;
  onBack: () => void;
}

export function NoteEditor({ initialContent, title, onSave, onBack }: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<number | null>(null);

  const debouncedSave = useCallback(
    (text: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        onSave(text);
      }, 1000);
    },
    [onSave]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    debouncedSave(val);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const newContent =
      content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(newContent);
    debouncedSave(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**') },
    { icon: Italic, action: () => insertMarkdown('_', '_') },
    { icon: Heading, action: () => insertMarkdown('## ') },
    { icon: List, action: () => insertMarkdown('- ') },
    { icon: Link, action: () => insertMarkdown('[', '](url)') },
  ];

  const renderMarkdown = (md: string) => {
    // Simple markdown rendering
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a class="text-[#f5a623] underline">$1</a>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="fixed inset-0 z-[90] bg-[#0e0e0f] flex flex-col">
      <div
        className="flex items-center justify-between p-4 bg-[#1a1a1c] border-b border-[#2a2a2c]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button
          onClick={onBack}
          className="text-[#f5a623] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={22} />
        </button>
        <h3 className="text-white font-[Instrument_Sans] text-sm truncate flex-1 text-center px-2">
          {title}
        </h3>
        <button
          onClick={() => setPreview(!preview)}
          className="text-[#a0a0a5] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {preview ? <Edit3 size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {!preview && (
        <div className="flex items-center gap-1 p-2 bg-[#151517] border-b border-[#2a2a2c]">
          {toolbarButtons.map(({ icon: Icon, action }, i) => (
            <button
              key={i}
              onClick={action}
              className="p-3 text-[#888] active:text-white min-h-[44px] min-w-[44px]
                flex items-center justify-center rounded-lg active:bg-[#222]"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {preview ? (
          <div
            className="p-4 text-white font-[Instrument_Sans] text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            className="w-full h-full bg-transparent text-white font-[DM_Mono] text-[16px]
              leading-relaxed p-4 resize-none outline-none"
            placeholder="Start writing..."
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck
          />
        )}
      </div>
    </div>
  );
}
