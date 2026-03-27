import { useState, useRef, useCallback } from 'react';
import { Lock, Plus, Search, LayoutGrid, List, ArrowDown, X, PenLine, Trash2, Download, Upload } from 'lucide-react';
import { BottomTabBar, type TabId } from '../components/BottomTabBar';
import { FileGrid } from '../components/FileGrid';
import { FileList } from '../components/FileList';
import { FilePreview } from '../components/FilePreview';
import { FolderView } from '../components/FolderView';
import { NoteEditor } from '../components/NoteEditor';
import { ActionSheet } from '../components/ActionSheet';
import { ContextMenu } from '../components/ContextMenu';
import type { FileMeta, Folder } from '../storage/index';
import type { VaultState } from '../hooks/useVault';
import { clearAllData } from '../storage/db';
import { clearVault } from '../storage/index';

type SortBy = 'date' | 'name' | 'size';

interface VaultScreenProps {
  state: VaultState;
  onLock: () => void;
  addFile: (file: File, folderId?: string | null) => Promise<void>;
  addNote: (title: string, content: string) => Promise<string | undefined>;
  updateNote: (id: string, content: string) => Promise<void>;
  readFile: (id: string, iv: string) => Promise<ArrayBuffer>;
  removeFile: (id: string) => Promise<void>;
  renameFile: (id: string, name: string) => Promise<void>;
  moveFile: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  exportBackup: () => Promise<Blob>;
  importBackup: (file: File) => Promise<{ fileCount: number; folderCount: number }>;
  refreshFiles: () => Promise<void>;
}

export function VaultScreen({
  state,
  onLock,
  addFile,
  addNote,
  updateNote,
  readFile,
  removeFile,
  renameFile,
  moveFile,
  createFolder,
  renameFolder,
  deleteFolder,
  exportBackup,
  importBackup,
  refreshFiles,
}: VaultScreenProps) {
  const [tab, setTab] = useState<TabId>('files');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMeta | null>(null);
  const [contextFile, setContextFile] = useState<FileMeta | null>(null);
  const [editingNote, setEditingNote] = useState<FileMeta | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetFile, setMoveTargetFile] = useState<FileMeta | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [autoLock, setAutoLock] = useState(
    () => localStorage.getItem('vault-autolock') || 'background'
  );
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(0);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const sortFiles = (files: FileMeta[]) => {
    const sorted = [...files];
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'size':
        sorted.sort((a, b) => b.size - a.size);
        break;
    }
    return sorted;
  };

  const filterFiles = (files: FileMeta[]) => {
    if (!searchQuery) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.mimeType.toLowerCase().includes(q)
    );
  };

  const allFiles = sortFiles(filterFiles(state.files.filter((f) => !f.isNote)));
  const notes = sortFiles(state.files.filter((f) => f.isNote));
  const folderFiles = selectedFolder
    ? allFiles.filter((f) => f.folderId === selectedFolder.id)
    : allFiles;

  const handlePhotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await addFile(file, selectedFolder?.id ?? null);
    }
    e.target.value = '';
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await addFile(file, selectedFolder?.id ?? null);
    }
    e.target.value = '';
  };

  const handleBackupExport = useCallback(async () => {
    try {
      setBackupStatus('Exporting...');
      const blob = await exportBackup();
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-backup-${date}.vault`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('Backup exported successfully');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (err) {
      setBackupStatus('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setTimeout(() => setBackupStatus(null), 4000);
    }
  }, [exportBackup]);

  const handleBackupImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      setBackupStatus('Importing...');
      const result = await importBackup(file);
      setBackupStatus(`Imported ${result.fileCount} file${result.fileCount !== 1 ? 's' : ''} and ${result.folderCount} folder${result.folderCount !== 1 ? 's' : ''}`);
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err) {
      setBackupStatus('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setTimeout(() => setBackupStatus(null), 5000);
    }
  }, [importBackup]);

  const handleExport = useCallback(async (file: FileMeta) => {
    const buffer = await readFile(file.id, file.iv);
    const blob = new Blob([buffer], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [readFile]);

  const handleOpenNote = useCallback(async (note: FileMeta) => {
    try {
      const buffer = await readFile(note.id, note.iv);
      const content = new TextDecoder().decode(buffer);
      setEditingNote(note);
      setEditingNoteContent(content);
    } catch {
      // Failed to decrypt
    }
  }, [readFile]);

  const handleNewNote = useCallback(async () => {
    const title = 'Untitled Note';
    const id = await addNote(title, '');
    if (id) {
      const note = state.files.find((f) => f.id === id);
      if (note) {
        setEditingNote(note);
        setEditingNoteContent('');
      }
    }
  }, [addNote, state.files]);

  const handleNoteBack = useCallback(async () => {
    if (editingNote && editingNoteContent !== undefined) {
      await updateNote(editingNote.id, editingNoteContent);
    }
    setEditingNote(null);
    setEditingNoteContent('');
  }, [editingNote, editingNoteContent, updateNote]);

  const handleAutoLockChange = (value: string) => {
    setAutoLock(value);
    localStorage.setItem('vault-autolock', value);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="min-h-[100dvh] bg-[#0e0e0f] flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 60px)',
      }}
    >
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      <input
        ref={backupInputRef}
        type="file"
        accept=".vault"
        className="hidden"
        onChange={handleBackupImport}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0e0e0f]">
        <h1 className="text-white font-[Instrument_Sans] font-bold text-xl">
          {tab === 'files' ? 'All Files' : tab === 'folders' ? 'Folders' : tab === 'notes' ? 'Notes' : 'Settings'}
        </h1>
        <div className="flex items-center gap-2">
          {tab === 'files' && (
            <>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="text-[#888] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {showSearch ? <X size={20} /> : <Search size={20} />}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="text-[#888] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {viewMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
              </button>
            </>
          )}
          <button
            onClick={onLock}
            className="text-[#f5a623] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Lock size={20} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && tab === 'files' && (
        <div className="px-4 pb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-[#1a1a1c] text-white rounded-xl px-4 py-3 font-[Instrument_Sans]
              text-[16px] outline-none border border-[#2a2a2c] focus:border-[#f5a623]
              placeholder-[#555]"
            autoFocus
          />
        </div>
      )}

      {/* Sort controls */}
      {tab === 'files' && (
        <div className="flex items-center gap-2 px-4 pb-3">
          {(['date', 'name', 'size'] as SortBy[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-[Instrument_Sans] transition-colors
                ${sortBy === s ? 'bg-[#f5a623] text-black' : 'bg-[#1a1a1c] text-[#888]'}`}
            >
              {s === 'date' ? 'Date' : s === 'name' ? 'Name' : 'Size'}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto px-4 pb-20">
        {tab === 'files' && (
          viewMode === 'grid' ? (
            <FileGrid
              files={allFiles}
              onTap={setPreviewFile}
              onLongPress={setContextFile}
              readFile={readFile}
            />
          ) : (
            <FileList
              files={allFiles}
              onTap={setPreviewFile}
              onLongPress={setContextFile}
              onDelete={(f) => removeFile(f.id)}
            />
          )
        )}

        {tab === 'folders' && (
          <FolderView
            folders={state.folders}
            files={state.files}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onOpenFolder={setSelectedFolder}
            selectedFolder={selectedFolder}
            onBack={() => setSelectedFolder(null)}
          >
            {selectedFolder && (
              viewMode === 'grid' ? (
                <FileGrid
                  files={folderFiles}
                  onTap={setPreviewFile}
                  onLongPress={setContextFile}
                  readFile={readFile}
                />
              ) : (
                <FileList
                  files={folderFiles}
                  onTap={setPreviewFile}
                  onLongPress={setContextFile}
                  onDelete={(f) => removeFile(f.id)}
                />
              )
            )}
          </FolderView>
        )}

        {tab === 'notes' && (
          <div>
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#555]">
                <ArrowDown size={48} className="mb-4" />
                <p className="font-[Instrument_Sans] text-sm">No notes yet</p>
                <p className="font-[Instrument_Sans] text-xs mt-1">Tap + to create a note</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-2 rounded-xl bg-[#1a1a1c]"
                  >
                    <button
                      onClick={() => handleOpenNote(note)}
                      className="flex flex-col gap-1 p-4 flex-1 min-w-0 active:bg-[#222]
                        text-left min-h-[52px] rounded-l-xl"
                    >
                      <p className="text-white text-sm font-[Instrument_Sans] truncate">
                        {note.name.replace(/\.md$/, '')}
                      </p>
                      <p className="text-[#666] text-xs font-[DM_Mono]">
                        {new Date(note.dateAdded).toLocaleDateString()} · {formatSize(note.size)}
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        setRenameTargetId(note.id);
                        setRenameValue(note.name.replace(/\.md$/, ''));
                        setShowRenameDialog(true);
                      }}
                      className="text-[#666] p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <PenLine size={16} />
                    </button>
                    <button
                      onClick={() => removeFile(note.id)}
                      className="text-red-400 p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="flex flex-col gap-6">
            {/* Auto-lock */}
            <div>
              <h3 className="text-[#888] text-xs font-[Instrument_Sans] uppercase tracking-wider mb-3">
                Auto-Lock
              </h3>
              <div className="flex flex-col gap-1">
                {[
                  { value: 'background', label: 'On Background' },
                  { value: '1min', label: '1 Minute' },
                  { value: '5min', label: '5 Minutes' },
                  { value: '15min', label: '15 Minutes' },
                  { value: '30min', label: '30 Minutes' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleAutoLockChange(value)}
                    className={`flex items-center justify-between p-4 rounded-xl min-h-[48px]
                      font-[Instrument_Sans] text-sm ${
                        autoLock === value
                          ? 'bg-[#1a1a1c] text-[#f5a623]'
                          : 'text-white active:bg-[#1a1a1c]'
                      }`}
                  >
                    {label}
                    {autoLock === value && <div className="w-2 h-2 rounded-full bg-[#f5a623]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div>
              <h3 className="text-[#888] text-xs font-[Instrument_Sans] uppercase tracking-wider mb-3">
                Storage
              </h3>
              <div className="p-4 rounded-xl bg-[#1a1a1c]">
                <p className="text-white text-sm font-[Instrument_Sans]">
                  Vault Size: {formatSize(state.storageSize)}
                </p>
                <p className="text-[#666] text-xs font-[DM_Mono] mt-1">
                  {state.files.length} file{state.files.length !== 1 ? 's' : ''} stored
                </p>
              </div>
            </div>

            {/* Backup */}
            <div>
              <h3 className="text-[#888] text-xs font-[Instrument_Sans] uppercase tracking-wider mb-3">
                Backup & Restore
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleBackupExport}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1c] text-white
                    font-[Instrument_Sans] text-sm text-left min-h-[48px] active:bg-[#222]"
                >
                  <Download size={20} className="text-[#f5a623]" />
                  Export Backup
                </button>
                <button
                  onClick={() => backupInputRef.current?.click()}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1c] text-white
                    font-[Instrument_Sans] text-sm text-left min-h-[48px] active:bg-[#222]"
                >
                  <Upload size={20} className="text-[#f5a623]" />
                  Import Backup
                </button>
                {backupStatus && (
                  <p className={`text-xs font-[Instrument_Sans] px-2 ${
                    backupStatus.startsWith('Import failed') || backupStatus.startsWith('Export failed')
                      ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {backupStatus}
                  </p>
                )}
                <p className="text-[#555] text-xs font-[Instrument_Sans] px-2 mt-1">
                  Backups are encrypted with your current PIN. You'll need the same PIN to restore.
                </p>
              </div>
            </div>

            {/* Danger Zone */}
            <div>
              <h3 className="text-red-400 text-xs font-[Instrument_Sans] uppercase tracking-wider mb-3">
                Danger Zone
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    if (confirm('Clear all decoy vault files? This cannot be undone.')) {
                      await clearVault('decoy');
                      await refreshFiles();
                    }
                  }}
                  className="p-4 rounded-xl bg-[#1a1a1c] text-red-400 font-[Instrument_Sans]
                    text-sm text-left min-h-[48px] active:bg-[#222]"
                >
                  Clear Decoy Vault
                </button>
                <button
                  onClick={async () => {
                    if (showDestroyConfirm < 2) {
                      setShowDestroyConfirm((c) => c + 1);
                      return;
                    }
                    if (confirm('FINAL WARNING: This will permanently destroy ALL vault data. Continue?')) {
                      await clearAllData();
                      window.location.reload();
                    }
                  }}
                  className="p-4 rounded-xl bg-red-500/10 text-red-400 font-[Instrument_Sans]
                    text-sm text-left min-h-[48px] active:bg-red-500/20"
                >
                  {showDestroyConfirm === 0
                    ? 'Destroy Everything'
                    : showDestroyConfirm === 1
                    ? 'Are you sure? Tap again.'
                    : 'Tap once more to confirm destruction'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      {tab !== 'settings' && (
        <button
          onClick={() => tab === 'notes' ? handleNewNote() : setShowActionSheet(true)}
          className="fixed right-5 bottom-[80px] w-14 h-14 rounded-full bg-[#f5a623] text-black
            flex items-center justify-center shadow-lg shadow-[#f5a623]/20 active:scale-95
            transition-transform z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        >
          <Plus size={24} />
        </button>
      )}

      {/* Tab Bar */}
      <BottomTabBar activeTab={tab} onTabChange={setTab} />

      {/* Action Sheet */}
      <ActionSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onAddPhotos={() => photoInputRef.current?.click()}
        onAddFiles={() => fileInputRef.current?.click()}
        onNewNote={async () => {
          await handleNewNote();
        }}
      />

      {/* File Preview */}
      <FilePreview
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        readFile={readFile}
        onExport={handleExport}
      />

      {/* Context Menu */}
      <ContextMenu
        open={!!contextFile}
        onClose={() => setContextFile(null)}
        onPreview={() => {
          if (contextFile) setPreviewFile(contextFile);
        }}
        onExport={() => {
          if (contextFile) handleExport(contextFile);
        }}
        onRename={() => {
          if (contextFile) {
            setRenameTargetId(contextFile.id);
            setRenameValue(contextFile.name);
            setShowRenameDialog(true);
          }
        }}
        onMove={() => {
          if (contextFile) {
            setMoveTargetFile(contextFile);
            setShowMoveDialog(true);
          }
        }}
        onDelete={() => {
          if (contextFile) {
            removeFile(contextFile.id);
          }
        }}
      />

      {/* Note Editor */}
      {editingNote && (
        <NoteEditor
          initialContent={editingNoteContent}
          title={editingNote.name.replace(/\.md$/, '')}
          onSave={(content) => {
            setEditingNoteContent(content);
          }}
          onBack={handleNoteBack}
        />
      )}

      {/* Rename Dialog */}
      {showRenameDialog && renameTargetId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowRenameDialog(false); setRenameTargetId(null); }} />
          <div className="relative bg-[#1a1a1c] rounded-2xl p-6 w-[90%] max-w-[350px]">
            <h3 className="text-white font-[Instrument_Sans] font-semibold mb-4">Rename</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-[#222224] text-white rounded-xl px-4 py-3 font-[Instrument_Sans]
                text-[16px] outline-none border border-[#333] focus:border-[#f5a623] mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = state.files.find((f) => f.id === renameTargetId);
                  if (target && renameValue.trim()) {
                    const newName = target.isNote && !renameValue.trim().endsWith('.md')
                      ? renameValue.trim() + '.md'
                      : renameValue.trim();
                    renameFile(renameTargetId, newName);
                    setShowRenameDialog(false);
                    setRenameTargetId(null);
                    setContextFile(null);
                  }
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowRenameDialog(false); setRenameTargetId(null); }}
                className="flex-1 py-3 rounded-xl bg-[#333] text-white font-[Instrument_Sans] min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = state.files.find((f) => f.id === renameTargetId);
                  if (renameTargetId && renameValue.trim()) {
                    const newName = target?.isNote && !renameValue.trim().endsWith('.md')
                      ? renameValue.trim() + '.md'
                      : renameValue.trim();
                    await renameFile(renameTargetId, newName);
                    setShowRenameDialog(false);
                    setRenameTargetId(null);
                    setContextFile(null);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-[#f5a623] text-black font-[Instrument_Sans]
                  font-semibold min-h-[44px]"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Folder Dialog */}
      {showMoveDialog && moveTargetFile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMoveDialog(false)} />
          <div className="relative bg-[#1a1a1c] rounded-2xl p-6 w-[90%] max-w-[350px]">
            <h3 className="text-white font-[Instrument_Sans] font-semibold mb-4">Move to Folder</h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-auto">
              <button
                onClick={async () => {
                  await moveFile(moveTargetFile.id, null);
                  setShowMoveDialog(false);
                  setMoveTargetFile(null);
                  setContextFile(null);
                }}
                className="p-3 rounded-xl bg-[#222224] text-white font-[Instrument_Sans]
                  text-sm text-left min-h-[44px] active:bg-[#333]"
              >
                No Folder (Root)
              </button>
              {state.folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={async () => {
                    await moveFile(moveTargetFile.id, folder.id);
                    setShowMoveDialog(false);
                    setMoveTargetFile(null);
                    setContextFile(null);
                  }}
                  className="p-3 rounded-xl bg-[#222224] text-white font-[Instrument_Sans]
                    text-sm text-left min-h-[44px] active:bg-[#333]"
                >
                  {folder.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMoveDialog(false)}
              className="w-full mt-4 py-3 rounded-xl bg-[#333] text-white font-[Instrument_Sans] min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
