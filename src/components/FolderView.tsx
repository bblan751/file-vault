import { useState } from 'react';
import { FolderOpen, Plus, Trash2, PenLine, ArrowLeft } from 'lucide-react';
import type { Folder, FileMeta } from '../storage/index';

interface FolderViewProps {
  folders: Folder[];
  files: FileMeta[];
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onOpenFolder: (folder: Folder) => void;
  selectedFolder: Folder | null;
  onBack: () => void;
  children?: React.ReactNode; // file list/grid when folder is open
}

export function FolderView({
  folders,
  files,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenFolder,
  selectedFolder,
  onBack,
  children,
}: FolderViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (selectedFolder) {
    return (
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#f5a623] mb-4 min-h-[44px] font-[Instrument_Sans]"
        >
          <ArrowLeft size={18} />
          Back to Folders
        </button>
        <h2 className="text-white font-[Instrument_Sans] font-semibold text-lg mb-4">
          {selectedFolder.name}
        </h2>
        {children}
      </div>
    );
  }

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateFolder(newName.trim());
      setNewName('');
      setShowCreate(false);
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      onRenameFolder(id, editName.trim());
      setEditingId(null);
      setEditName('');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-[Instrument_Sans] font-semibold text-lg">Folders</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="text-[#f5a623] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Plus size={22} />
        </button>
      </div>

      {showCreate && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            className="flex-1 bg-[#222224] text-white rounded-xl px-4 py-3 font-[Instrument_Sans]
              text-[16px] outline-none border border-[#333] focus:border-[#f5a623]"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="bg-[#f5a623] text-black px-4 rounded-xl font-[Instrument_Sans] font-semibold min-h-[44px]"
          >
            Add
          </button>
        </div>
      )}

      {folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#555]">
          <FolderOpen size={48} className="mb-4" />
          <p className="font-[Instrument_Sans] text-sm">No folders yet</p>
          <p className="font-[Instrument_Sans] text-xs mt-1">Create one to organize your files</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {folders.map((folder) => {
            const fileCount = files.filter((f) => f.folderId === folder.id).length;
            return (
              <div
                key={folder.id}
                className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1c] active:bg-[#222]"
              >
                {editingId === folder.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-[#222224] text-white rounded-lg px-3 py-2 text-[16px]
                        font-[Instrument_Sans] outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(folder.id)}
                    />
                    <button
                      onClick={() => handleRename(folder.id)}
                      className="text-[#f5a623] font-[Instrument_Sans] px-3 min-h-[44px]"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => onOpenFolder(folder)}
                    >
                      <FolderOpen size={22} className="text-[#f5a623] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-[Instrument_Sans] truncate">
                          {folder.name}
                        </p>
                        <p className="text-[#666] text-xs font-[DM_Mono]">
                          {fileCount} file{fileCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditingId(folder.id); setEditName(folder.name); }}
                      className="text-[#666] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <PenLine size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteFolder(folder.id)}
                      className="text-red-400 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
