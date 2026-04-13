interface Props {
  active: string;
  onNavigate: (screen: string) => void;
}

const tabs = [
  { id: 'job', icon: '🏠', label: 'New Job' },
  { id: 'jobs', icon: '📋', label: 'My Jobs' },
  { id: 'sub', icon: '⚡', label: 'Pro' },
];

export default function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-input flex justify-around py-2 px-4 z-50">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onNavigate(tab.id)}
          className={`flex flex-col items-center gap-0.5 py-2 px-5 rounded-xl transition-colors ${
            active === tab.id ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <span className="text-2xl">{tab.icon}</span>
          <span className="text-xs font-bold">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
