import { Files, FolderOpen, StickyNote, Settings } from 'lucide-react';

export type TabId = 'files' | 'folders' | 'notes' | 'settings';

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Files }[] = [
  { id: 'files', label: 'All Files', icon: Files },
  { id: 'folders', label: 'Folders', icon: FolderOpen },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#1a1a1c] border-t border-[#2a2a2c]
        flex justify-around items-center z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex flex-col items-center gap-1 py-2 px-4 min-w-[60px] min-h-[44px]
            transition-colors ${
              activeTab === id ? 'text-[#f5a623]' : 'text-[#666]'
            }`}
        >
          <Icon size={22} />
          <span className="text-[10px] font-[Instrument_Sans]">{label}</span>
        </button>
      ))}
    </nav>
  );
}
