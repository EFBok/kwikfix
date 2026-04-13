import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getCompany, getJobs, getProSettings, saveCompany, saveProSettings } from '@/store/kwikfix-store';
import { AVAILABLE_SHARE_APPS, Company, Job, ProSettings } from '@/types/kwikfix';
import { generateAiBrandStyle } from '@/lib/brandTemplateAi';
import { buildDocumentPdfBlob } from '@/lib/pdfBuilder';

type ProOptionKey = 'brand' | 'user' | 'bank' | 'payment' | 'theme';
type TimelineRange = '1w' | '1m' | '1y';

interface SubscriptionScreenProps {
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export default function SubscriptionScreen({ onThemeChange }: SubscriptionScreenProps) {
  const [settings, setSettings] = useState<ProSettings>(getProSettings());
  const [company, setCompany] = useState<Company | null>(getCompany());
  const [brandPrompt, setBrandPrompt] = useState('');
  const [expandedOption, setExpandedOption] = useState<ProOptionKey | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [dirtyOptions, setDirtyOptions] = useState<Record<ProOptionKey, boolean>>({
    brand: false,
    user: false,
    bank: false,
    payment: false,
    theme: false,
  });
  const [savedOptions, setSavedOptions] = useState<Record<ProOptionKey, boolean>>({
    brand: false,
    user: false,
    bank: false,
    payment: false,
    theme: false,
  });
  const [timelineRange, setTimelineRange] = useState<TimelineRange>('1m');
  const [startingIncomeDraft, setStartingIncomeDraft] = useState<string>(String(getProSettings().reportStartingIncome ?? 0));
  const jobs = getJobs();

  const previewJob: Job = {
    id: 'preview',
    photo: null,
    voiceText: '',
    customerName: 'Preview Customer',
    description: 'Install exterior security light and test circuit.',
    labourAmount: 1200,
    partsAmount: 450,
    total: 1650,
    location: 'Cape Town',
    status: 'Draft',
    type: 'quote',
    createdAt: new Date().toISOString(),
  };

  const parseDateForReporting = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
    return new Date(value);
  };

  const monthlyTotals = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthlyJobs = jobs.filter(job => {
      const created = parseDateForReporting(job.createdAt);
      return created.getMonth() === month && created.getFullYear() === year;
    });

    const totalInvoiced = monthlyJobs
      .filter(job => job.type === 'invoice')
      .reduce((sum, job) => sum + job.total, 0);

    const totalReceived = monthlyJobs
      .filter(job => {
        if (job.type !== 'invoice' || job.status !== 'Paid') return false;
        const paidDate = parseDateForReporting(job.paidAt || job.createdAt);
        return paidDate.getMonth() === month && paidDate.getFullYear() === year;
      })
      .reduce((sum, job) => sum + job.total, 0);

    return { totalInvoiced, totalReceived };
  }, [jobs]);

  const timelineData = useMemo(() => {
    const nowDate = new Date();
    const now = nowDate.getTime();
    const startDate = new Date(nowDate);
    if (timelineRange === '1w') {
      startDate.setDate(nowDate.getDate() - 7);
    } else if (timelineRange === '1m') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }
    const startTime = startDate.getTime();
    const startValue = Math.max(0, Number(settings.reportStartingIncome) || 0);

    const paidEvents = jobs
      .filter(job => job.type === 'invoice' && job.status === 'Paid')
      .map(job => ({
        id: job.id,
        total: job.total,
        timestamp: parseDateForReporting(job.paidAt || job.createdAt).getTime(),
      }))
      .filter(event => event.timestamp >= startTime && event.timestamp <= now)
      .sort((a, b) => a.timestamp - b.timestamp);

    let runningTotal = startValue;
    const points: Array<{ xTime: number; value: number; isPaidEvent: boolean }> = [
      { xTime: startTime, value: runningTotal, isPaidEvent: false },
    ];

    paidEvents.forEach(event => {
      runningTotal += event.total;
      points.push({ xTime: event.timestamp, value: runningTotal, isPaidEvent: true });
    });

    points.push({ xTime: now, value: runningTotal, isPaidEvent: false });

    return { startTime, endTime: now, points };
  }, [jobs, timelineRange, settings.reportStartingIncome]);

  const formatXAxisLabel = (time: number) => {
    const date = new Date(time);
    if (timelineRange === '1w') return date.toLocaleDateString(undefined, { weekday: 'short' });
    if (timelineRange === '1m') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };

  const buildSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      path += ` Q ${midX} ${current.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const markOptionDirty = (option: ProOptionKey) => {
    setDirtyOptions(prev => ({ ...prev, [option]: true }));
    setSavedOptions(prev => ({ ...prev, [option]: false }));
  };

  const markOptionSaved = (option: ProOptionKey) => {
    setDirtyOptions(prev => ({ ...prev, [option]: false }));
    setSavedOptions(prev => ({ ...prev, [option]: true }));
  };

  const handleSaveSettingsOption = (option: ProOptionKey, message: string) => {
    saveProSettings(settings);
    markOptionSaved(option);
    toast.success(message);
  };

  const handleSaveBrandStudio = () => {
    if (!company) {
      toast.error('Set up your business first');
      return;
    }
    saveCompany(company);
    saveProSettings(settings);
    markOptionSaved('brand');
    toast.success('Brand template updated');
  };

  const handleGenerateBrandStyle = () => {
    if (!company) return;
    if (!brandPrompt.trim()) {
      toast.error('Describe your brand style first');
      return;
    }
    const generated = generateAiBrandStyle(brandPrompt, company.brandColor);
    setCompany({
      ...company,
      ...generated,
    });
    markOptionDirty('brand');
    toast.success('AI custom template generated');
  };

  const handleRefreshPdfPreview = async () => {
    if (!company) return;
    const previewSettings: ProSettings = {
      ...settings,
      developerMode: true,
      bankDetails: {
        bankName: settings.bankDetails.bankName || 'Standard Bank',
        accountName: settings.bankDetails.accountName || 'KwikFix Demo Services',
        accountNumber: settings.bankDetails.accountNumber || '1234567890',
        branchCode: settings.bankDetails.branchCode || '051001',
        accountType: settings.bankDetails.accountType || 'Business Current',
      },
      paymentIntegrations: {
        ...settings.paymentIntegrations,
        enableStripe: true,
        stripePublishableKey: settings.paymentIntegrations.stripePublishableKey || 'pk_live_demo_1234',
      },
    };
    const blob = await buildDocumentPdfBlob(previewJob, company, previewSettings);
    const url = URL.createObjectURL(blob);
    if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
    setPreviewPdfUrl(url);
  };

  const handleSaveStartingIncome = () => {
    const parsed = Number(startingIncomeDraft);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    const updatedSettings = { ...settings, reportStartingIncome: normalized };
    setSettings(updatedSettings);
    saveProSettings(updatedSettings);
    setStartingIncomeDraft(String(normalized));
    toast.success('Starting income updated');
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8 pb-24">
      <div className="max-w-md mx-auto">
        <div className="text-6xl mb-4 text-center">⚡</div>
        <h1 className="text-3xl font-black text-foreground text-center mb-2">KwikFix Pro</h1>
        <p className="text-xl text-muted-foreground text-center mb-6">
          $29 per month — 14 day free trial
        </p>
        <ul className="space-y-3 mb-8 w-full">
          {['Unlimited quotes & invoices', 'Branded PDF exports', 'Payment tracking', 'Priority support'].map(f => (
            <li key={f} className="flex items-center gap-3 text-lg text-foreground">
              <span className="text-secondary text-xl">✓</span> {f}
            </li>
          ))}
        </ul>
        <button
          onClick={() => toast.info('Stripe integration coming soon!')}
          className="w-full h-16 rounded-2xl bg-secondary text-secondary-foreground text-xl font-black active:scale-[0.96] transition-transform"
        >
          Start Free Trial
        </button>
        <p className="text-sm text-muted-foreground mt-4 text-center">Cancel anytime. No commitment.</p>

        <div className="mt-8 rounded-2xl border border-input bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-black text-foreground">Pro User Options</p>
              <p className="text-sm text-muted-foreground">Manage advanced Pro settings</p>
            </div>
            <button
              onClick={() => {
                const updated = { ...settings, developerMode: !settings.developerMode };
                setSettings(updated);
                saveProSettings(updated);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold ${
                settings.developerMode ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}
            >
              {settings.developerMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {settings.developerMode && (
            <div className="space-y-5 pt-2">
              <div className="space-y-3">
                <div className="rounded-xl border border-input bg-background">
                  <button
                    onClick={() => setExpandedOption(prev => prev === 'brand' ? null : 'brand')}
                    className="w-full px-3 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-black text-foreground">Pro Brand Studio</span>
                    <span className="text-xs text-muted-foreground">{expandedOption === 'brand' ? 'Collapse' : 'Expand'}</span>
                  </button>
                  {expandedOption === 'brand' && company && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {['clean', 'bold', 'modern', 'custom'].map(templateId => (
                            <button
                              key={templateId}
                              onClick={() => {
                                setCompany(prev => prev ? { ...prev, template: templateId as Company['template'] } : prev);
                                markOptionDirty('brand');
                              }}
                              className={`h-9 rounded-lg text-xs font-bold border ${
                                company.template === templateId ? 'border-primary bg-accent' : 'border-input'
                              }`}
                            >
                              {templateId}
                            </button>
                          ))}
                        </div>
                        <input
                          type="color"
                          value={company.brandColor}
                          onChange={e => {
                            setCompany(prev => prev ? { ...prev, brandColor: e.target.value } : prev);
                            markOptionDirty('brand');
                          }}
                          className="w-full h-10 rounded-lg border border-input bg-background"
                        />
                        <textarea
                          value={brandPrompt}
                          onChange={e => {
                            setBrandPrompt(e.target.value);
                            markOptionDirty('brand');
                          }}
                          rows={3}
                          placeholder="Describe your brand style (e.g. 'premium, airy spacing, editorial luxury with serif headings')"
                          className="w-full rounded-xl border border-input bg-background p-3 text-sm"
                        />
                        <button
                          onClick={handleGenerateBrandStyle}
                          className="w-full h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-black"
                        >
                          Generate AI Custom Template
                        </button>
                        {company.customBrandStyle && (
                          <p className="text-xs text-muted-foreground">
                            Font: {company.customBrandStyle.fontFamily} | Spacing: {company.customBrandStyle.spacing} | Style: {company.customBrandStyle.style} | Layout: {company.customBrandStyle.layout}
                          </p>
                        )}
                        {company.customBrandStyle?.palette && (
                          <div className="flex gap-2">
                            {Object.entries(company.customBrandStyle.palette).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="w-3 h-3 rounded-full border border-input" style={{ backgroundColor: value }} />
                                {key}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="rounded-xl border border-input bg-background p-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground">Live template preview</p>
                            <button
                              onClick={handleRefreshPdfPreview}
                              className="px-2 py-1 rounded-md bg-muted text-xs font-bold"
                            >
                              Refresh Preview
                            </button>
                          </div>
                          {previewPdfUrl ? (
                            <iframe
                              src={previewPdfUrl}
                              title="PDF Preview"
                              className="w-full h-[420px] rounded-lg border border-input bg-white"
                            />
                          ) : (
                            <div className="h-28 rounded-lg border border-dashed border-input flex items-center justify-center text-sm text-muted-foreground">
                              Click Refresh Preview to render PDF example
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl border border-input p-3">
                          <label className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-black text-foreground">KwikFix watermark on PDF</p>
                              <p className="text-xs text-muted-foreground">Show KwikFix logo at bottom of invoices/quotes</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={!settings.disableKwikFixWatermark}
                              onChange={e => {
                                setSettings(prev => ({ ...prev, disableKwikFixWatermark: !e.target.checked }));
                                markOptionDirty('brand');
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveBrandStudio}
                        className={`w-full h-10 rounded-xl text-sm font-black ${
                          savedOptions.brand && !dirtyOptions.brand
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {savedOptions.brand && !dirtyOptions.brand ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-input bg-background">
                  <button
                    onClick={() => setExpandedOption(prev => prev === 'user' ? null : 'user')}
                    className="w-full px-3 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-black text-foreground">User Information</span>
                    <span className="text-xs text-muted-foreground">{expandedOption === 'user' ? 'Collapse' : 'Expand'}</span>
                  </button>
                  {expandedOption === 'user' && (
                    <div className="px-3 pb-3 space-y-2">
                      <input
                        value={settings.userProfile.fullName}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, userProfile: { ...prev.userProfile, fullName: e.target.value } }));
                          markOptionDirty('user');
                        }}
                        placeholder="Your full name"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <input
                        value={settings.userProfile.email}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, userProfile: { ...prev.userProfile, email: e.target.value } }));
                          markOptionDirty('user');
                        }}
                        placeholder="Email address"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <input
                        value={settings.userProfile.phone}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, userProfile: { ...prev.userProfile, phone: e.target.value } }));
                          markOptionDirty('user');
                        }}
                        placeholder="Phone number"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Quick send option</p>
                        <select
                          value={settings.quickSendApp}
                          onChange={e => {
                            setSettings(prev => ({ ...prev, quickSendApp: e.target.value }));
                            markOptionDirty('user');
                          }}
                          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          {AVAILABLE_SHARE_APPS.map(app => (
                            <option key={app.id} value={app.id}>
                              {app.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleSaveSettingsOption('user', 'User information saved')}
                        className={`w-full h-10 rounded-xl text-sm font-black ${
                          savedOptions.user && !dirtyOptions.user ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {savedOptions.user && !dirtyOptions.user ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-input bg-background">
                  <button
                    onClick={() => setExpandedOption(prev => prev === 'bank' ? null : 'bank')}
                    className="w-full px-3 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-black text-foreground">Bank Details</span>
                    <span className="text-xs text-muted-foreground">{expandedOption === 'bank' ? 'Collapse' : 'Expand'}</span>
                  </button>
                  {expandedOption === 'bank' && (
                    <div className="px-3 pb-3 space-y-2">
                      <input
                        value={settings.bankDetails.bankName}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: e.target.value } }));
                          markOptionDirty('bank');
                        }}
                        placeholder="Bank name"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <input
                        value={settings.bankDetails.accountName}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountName: e.target.value } }));
                          markOptionDirty('bank');
                        }}
                        placeholder="Account name"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={settings.bankDetails.accountNumber}
                          onChange={e => {
                            setSettings(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: e.target.value } }));
                            markOptionDirty('bank');
                          }}
                          placeholder="Account number"
                          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                        />
                        <input
                          value={settings.bankDetails.branchCode}
                          onChange={e => {
                            setSettings(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, branchCode: e.target.value } }));
                            markOptionDirty('bank');
                          }}
                          placeholder="Branch code"
                          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                        />
                      </div>
                      <input
                        value={settings.bankDetails.accountType}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountType: e.target.value } }));
                          markOptionDirty('bank');
                        }}
                        placeholder="Account type (e.g. Current)"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <button
                        onClick={() => handleSaveSettingsOption('bank', 'Bank details saved')}
                        className={`w-full h-10 rounded-xl text-sm font-black ${
                          savedOptions.bank && !dirtyOptions.bank ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {savedOptions.bank && !dirtyOptions.bank ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-input bg-background">
                  <button
                    onClick={() => setExpandedOption(prev => prev === 'payment' ? null : 'payment')}
                    className="w-full px-3 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-black text-foreground">Payment Integration</span>
                    <span className="text-xs text-muted-foreground">{expandedOption === 'payment' ? 'Collapse' : 'Expand'}</span>
                  </button>
                  {expandedOption === 'payment' && (
                    <div className="px-3 pb-3 space-y-2">
                      <label className="flex items-center justify-between rounded-xl border border-input p-3">
                        <span className="text-sm font-semibold">Enable PayFast</span>
                        <input
                          type="checkbox"
                          checked={settings.paymentIntegrations.enablePayFast}
                          onChange={e => {
                            setSettings(prev => ({ ...prev, paymentIntegrations: { ...prev.paymentIntegrations, enablePayFast: e.target.checked } }));
                            markOptionDirty('payment');
                          }}
                        />
                      </label>
                      <input
                        value={settings.paymentIntegrations.payFastMerchantId}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, paymentIntegrations: { ...prev.paymentIntegrations, payFastMerchantId: e.target.value } }));
                          markOptionDirty('payment');
                        }}
                        placeholder="PayFast Merchant ID"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <label className="flex items-center justify-between rounded-xl border border-input p-3">
                        <span className="text-sm font-semibold">Enable Stripe</span>
                        <input
                          type="checkbox"
                          checked={settings.paymentIntegrations.enableStripe}
                          onChange={e => {
                            setSettings(prev => ({ ...prev, paymentIntegrations: { ...prev.paymentIntegrations, enableStripe: e.target.checked } }));
                            markOptionDirty('payment');
                          }}
                        />
                      </label>
                      <input
                        value={settings.paymentIntegrations.stripePublishableKey}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, paymentIntegrations: { ...prev.paymentIntegrations, stripePublishableKey: e.target.value } }));
                          markOptionDirty('payment');
                        }}
                        placeholder="Stripe publishable key"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <input
                        value={settings.paymentIntegrations.customPaymentLink}
                        onChange={e => {
                          setSettings(prev => ({ ...prev, paymentIntegrations: { ...prev.paymentIntegrations, customPaymentLink: e.target.value } }));
                          markOptionDirty('payment');
                        }}
                        placeholder="Custom payment link"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <button
                        onClick={() => handleSaveSettingsOption('payment', 'Payment integrations saved')}
                        className={`w-full h-10 rounded-xl text-sm font-black ${
                          savedOptions.payment && !dirtyOptions.payment ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {savedOptions.payment && !dirtyOptions.payment ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-input bg-background">
                  <button
                    onClick={() => setExpandedOption(prev => prev === 'theme' ? null : 'theme')}
                    className="w-full px-3 py-3 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-black text-foreground">Theme</span>
                    <span className="text-xs text-muted-foreground">{expandedOption === 'theme' ? 'Collapse' : 'Expand'}</span>
                  </button>
                  {expandedOption === 'theme' && (
                    <div className="px-3 pb-3 space-y-3">
                      <p className="text-xs text-muted-foreground">Choose a theme for the full app interface.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['light', 'dark'] as const).map(theme => (
                          <button
                            key={theme}
                            onClick={() => {
                              setSettings(prev => ({ ...prev, theme }));
                              onThemeChange?.(theme);
                              markOptionDirty('theme');
                            }}
                            className={`h-10 rounded-xl text-sm font-black border ${
                              settings.theme === theme ? 'border-primary bg-accent text-foreground' : 'border-input bg-background text-muted-foreground'
                            }`}
                          >
                            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleSaveSettingsOption('theme', 'Theme saved')}
                        className={`w-full h-10 rounded-xl text-sm font-black ${
                          savedOptions.theme && !dirtyOptions.theme ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {savedOptions.theme && !dirtyOptions.theme ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-base font-black text-foreground mb-2">Monthly Report</p>
                <div className="rounded-xl border border-input bg-background p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total invoiced</span>
                    <span className="text-lg font-black text-foreground">R {monthlyTotals.totalInvoiced.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Received income</span>
                    <span className="text-lg font-black text-secondary">R {monthlyTotals.totalReceived.toFixed(2)}</span>
                  </div>

                  <div className="pt-1 border-t border-input">
                    <p className="text-xs font-bold text-muted-foreground mb-2">Incoming invoices timeline</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {([
                        { key: '1w', label: '1 Week' },
                        { key: '1m', label: '1 Month' },
                        { key: '1y', label: '1 Year' },
                      ] as Array<{ key: TimelineRange; label: string }>).map(option => (
                        <button
                          key={option.key}
                          onClick={() => setTimelineRange(option.key)}
                          className={`h-9 rounded-lg text-xs font-bold border ${
                            timelineRange === option.key ? 'border-primary bg-accent text-foreground' : 'border-input'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-xl border border-input bg-card p-3">
                      {(() => {
                        const chartWidth = 360;
                        const chartHeight = 180;
                        const padding = { top: 12, right: 8, bottom: 22, left: 42 };
                        const plotWidth = chartWidth - padding.left - padding.right;
                        const plotHeight = chartHeight - padding.top - padding.bottom;

                        const maxValue = Math.max(...timelineData.points.map(point => point.value), 1);
                        const yMax = Math.max(1, Math.ceil(maxValue * 1.1));
                        const timeSpan = Math.max(1, timelineData.endTime - timelineData.startTime);

                        const chartPoints = timelineData.points.map(point => ({
                          x: padding.left + ((point.xTime - timelineData.startTime) / timeSpan) * plotWidth,
                          y: padding.top + (1 - point.value / yMax) * plotHeight,
                          isPaidEvent: point.isPaidEvent,
                        }));

                        const smoothPath = buildSmoothPath(chartPoints.map(point => ({ x: point.x, y: point.y })));
                        const paidDots = chartPoints.filter(point => point.isPaidEvent);

                        return (
                          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-48">
                            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
                            <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
                            <text x={6} y={padding.top + plotHeight + 2} fontSize="10" fill="hsl(var(--muted-foreground))">R 0</text>
                            <text x={6} y={padding.top + 3} fontSize="10" fill="hsl(var(--muted-foreground))">R {yMax.toFixed(0)}</text>
                            <path d={smoothPath} fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" strokeLinecap="round" />
                            {paidDots.map((dot, idx) => (
                              <circle key={`dot-${idx}`} cx={dot.x} cy={dot.y} r="3.2" fill="hsl(var(--primary))" />
                            ))}
                            <text x={padding.left} y={chartHeight - 6} fontSize="10" fill="hsl(var(--muted-foreground))">
                              {formatXAxisLabel(timelineData.startTime)}
                            </text>
                            <text x={padding.left + plotWidth - 46} y={chartHeight - 6} fontSize="10" fill="hsl(var(--muted-foreground))">
                              {formatXAxisLabel(timelineData.endTime)}
                            </text>
                          </svg>
                        );
                      })()}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Dots show when invoices were marked paid. Line tracks cumulative income in the selected period.
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="number"
                        min={0}
                        value={startingIncomeDraft}
                        onChange={e => setStartingIncomeDraft(e.target.value)}
                        placeholder="Starting income for late adoption"
                        className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <button
                        onClick={handleSaveStartingIncome}
                        className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-black"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
