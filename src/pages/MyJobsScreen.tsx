import { useState } from 'react';
import { getJobs, saveJob } from '@/store/kwikfix-store';
import { Job } from '@/types/kwikfix';
import { toast } from 'sonner';
import QuotePreview from '@/components/QuotePreview';
import SharePanel from '@/components/SharePanel';

export default function MyJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>(getJobs());
  const [selected, setSelected] = useState<Job | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const refresh = () => { setJobs(getJobs()); };

  const markPaid = (job: Job) => {
    const updated = { ...job, status: 'Paid' as const };
    saveJob(updated);
    refresh();
    setSelected(updated);
    toast.success('Marked as paid!');
  };

  const convertToInvoice = (job: Job) => {
    const updated = { ...job, type: 'invoice' as const };
    saveJob(updated);
    refresh();
    setSelected(updated);
    toast.success('Converted to invoice!');
  };

  const typeLabel = (job: Job) => (job.type || 'quote') === 'invoice' ? 'Invoice' : 'Quote';
  const typeBadgeClass = (job: Job) =>
    (job.type || 'quote') === 'invoice'
      ? 'bg-primary/15 text-primary'
      : 'bg-secondary/15 text-secondary';

  // === DETAIL VIEW ===
  if (selected) {
    const isQuote = (selected.type || 'quote') === 'quote';

    // Full branded preview mode
    if (showPreview) {
      return (
        <div className="min-h-screen bg-background px-4 py-6 pb-24">
          <button
            onClick={() => setShowPreview(false)}
            className="text-lg font-bold text-primary mb-4"
          >
            ← Back
          </button>
          <h2 className="text-xl font-black text-foreground mb-4">
            {typeLabel(selected)} Preview
          </h2>

          <QuotePreview job={selected} />

          <div className="mt-6">
            <p className="text-lg font-bold text-foreground mb-3">Send this {typeLabel(selected).toLowerCase()}</p>
            <SharePanel job={selected} />
          </div>
        </div>
      );
    }

    // Normal detail view
    return (
      <div className="min-h-screen bg-background px-4 py-6 pb-24">
        <button onClick={() => { setSelected(null); setShowPreview(false); }} className="text-lg font-bold text-primary mb-4">
          ← Back
        </button>
        <div className="rounded-2xl bg-card border border-input p-5">
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-3 ${typeBadgeClass(selected)}`}>
            {typeLabel(selected)}
          </span>

          {selected.photo && <img src={selected.photo} alt="" className="w-full h-40 rounded-xl object-cover mb-4" />}
          <h2 className="text-2xl font-black text-foreground mb-1">{selected.customerName}</h2>
          <p className="text-muted-foreground mb-3">{selected.description}</p>
          <p className="text-sm text-muted-foreground mb-1">📍 {selected.location}</p>
          <div className="border-t border-input mt-3 pt-3 space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Labour</span><span className="font-bold">R {selected.labourAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Parts</span><span className="font-bold">R {selected.partsAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-black"><span>Total</span><span>R {selected.total.toFixed(2)}</span></div>
          </div>
          <div className="mt-3">
            <span className={`inline-block px-4 py-2 rounded-full text-base font-bold ${
              selected.status === 'Paid' ? 'bg-secondary/20 text-secondary' : 'bg-accent text-accent-foreground'
            }`}>
              {selected.status}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {/* View & Share */}
            <button
              onClick={() => setShowPreview(true)}
              className="w-full h-16 rounded-2xl bg-foreground text-background text-xl font-black active:scale-[0.96] transition-transform"
            >
              👁 View & Share
            </button>

            {isQuote && (
              <button
                onClick={() => convertToInvoice(selected)}
                className="w-full h-16 rounded-2xl bg-primary text-primary-foreground text-xl font-black active:scale-[0.96] transition-transform"
              >
                Convert to Invoice →
              </button>
            )}
            {selected.status !== 'Paid' && (
              <button
                onClick={() => markPaid(selected)}
                className="w-full h-16 rounded-2xl bg-secondary text-secondary-foreground text-xl font-black active:scale-[0.96] transition-transform"
              >
                Mark as Paid ✓
              </button>
            )}
          </div>
        </div>

        {/* Inline share buttons */}
        <div className="mt-5">
          <p className="text-lg font-bold text-foreground mb-3">Quick Share</p>
          <SharePanel job={selected} />
        </div>
      </div>
    );
  }

  // === LIST VIEW ===
  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24">
      <h1 className="text-3xl font-black text-foreground mb-6">My Jobs</h1>
      {jobs.length === 0 ? (
        <p className="text-center text-muted-foreground text-lg mt-20">No jobs yet. Create your first quote!</p>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <button
              key={job.id}
              onClick={() => { setSelected(job); setShowPreview(false); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-input active:scale-[0.98] transition-transform text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {job.photo ? (
                  <img src={job.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🔧</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-lg font-bold text-foreground truncate">{job.customerName}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${typeBadgeClass(job)}`}>
                    {typeLabel(job)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{job.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-foreground">R {job.total.toFixed(0)}</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  job.status === 'Paid' ? 'bg-secondary/20 text-secondary' : 'bg-accent text-accent-foreground'
                }`}>
                  {job.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
