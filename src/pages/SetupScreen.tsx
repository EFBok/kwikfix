import { useState, useRef } from 'react';
import { Company, AVAILABLE_SHARE_APPS } from '@/types/kwikfix';
import { saveCompany } from '@/store/kwikfix-store';

const BRAND_COLORS = ['#2563eb', '#059669', '#0891b2', '#d97706', '#dc2626', '#7c3aed'];
const TEMPLATES = [
  { id: 'clean' as const, label: 'Clean', desc: 'Simple & white' },
  { id: 'bold' as const, label: 'Bold', desc: 'Color header' },
  { id: 'modern' as const, label: 'Modern', desc: 'Gradient style' },
];

export default function SetupScreen({ onComplete }: { onComplete: () => void }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[0]);
  const [template, setTemplate] = useState<Company['template']>('clean');
  const [shareApps, setShareApps] = useState<string[]>(['whatsapp', 'email']);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    saveCompany({ logo, name: name.trim(), brandColor, template, shareApps });
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 py-10">
      <h1 className="text-3xl font-black text-foreground text-center mb-2">
        Setup KwikFix in 1 minute
      </h1>
      <p className="text-muted-foreground text-center mb-8">One-time setup for your business</p>

      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleLogo} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-28 rounded-2xl border-2 border-dashed border-input bg-card flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          {logo ? (
            <img src={logo} alt="Logo" className="h-16 w-16 rounded-xl object-contain" />
          ) : (
            <>
              <span className="text-4xl">📷</span>
              <span className="text-lg font-bold text-muted-foreground">Upload Company Logo</span>
            </>
          )}
        </button>

        {/* Name */}
        <input
          type="text"
          placeholder="Company Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full h-16 rounded-2xl border border-input bg-card px-5 text-xl font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Brand Color */}
        <div>
          <p className="text-lg font-bold text-foreground mb-3">Choose Brand Color</p>
          <div className="flex gap-3 flex-wrap">
            {BRAND_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setBrandColor(c)}
                className="w-14 h-14 rounded-2xl border-4 transition-all active:scale-90"
                style={{
                  backgroundColor: c,
                  borderColor: brandColor === c ? c : 'transparent',
                  boxShadow: brandColor === c ? `0 0 0 3px ${c}40` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Template */}
        <div>
          <p className="text-lg font-bold text-foreground mb-3">Quote Template</p>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  template === t.id
                    ? 'border-primary bg-accent'
                    : 'border-input bg-card'
                }`}
              >
                <span className="text-base font-bold text-foreground">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Share Apps */}
        <div>
          <p className="text-lg font-bold text-foreground mb-3">Share Buttons</p>
          <p className="text-sm text-muted-foreground mb-3">Pick which apps appear when sharing quotes</p>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_SHARE_APPS.map(app => {
              const active = shareApps.includes(app.id);
              return (
                <button
                  key={app.id}
                  onClick={() =>
                    setShareApps(prev =>
                      active ? prev.filter(id => id !== app.id) : [...prev, app.id]
                    )
                  }
                  className={`h-16 rounded-2xl border-2 flex items-center justify-center gap-2 text-base font-bold transition-all active:scale-95 ${
                    active ? 'border-primary bg-accent text-foreground' : 'border-input bg-card text-muted-foreground'
                  }`}
                >
                  <span className="text-xl">{app.icon}</span>
                  {app.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full h-16 rounded-2xl bg-secondary text-secondary-foreground text-xl font-black active:scale-[0.97] transition-transform disabled:opacity-40"
        >
          Save & Start Using App ✓
        </button>
      </div>
    </div>
  );
}
