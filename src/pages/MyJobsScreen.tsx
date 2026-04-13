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
  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [editDraft, setEditDraft] = useState<Job | null>(null);

  const refresh = () => { setJobs(getJobs()); };

  const markPaid = (job: Job) => {
    const updated = { ...job, status: 'Paid' as const, paidAt: job.paidAt || new Date().toISOString() };
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

  const startEditing = (job: Job) => {
    setEditDraft({
      ...job,
      lineItems: [...(job.lineItems || [])],
    });
    setIsEditingSelected(true);
  };

  const toDateTimeLocalValue = (iso: string | undefined) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const fromDateTimeLocalValue = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
  };

  const toDateOnlyValue = (value: string | undefined) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const saveEdit = () => {
    if (!editDraft) return;
    const normalizedLineItems = (editDraft.lineItems || [])
      .map(item => ({ name: item.name.trim(), price: Number(item.price) || 0 }))
      .filter(item => item.name && item.price > 0);
    const labourAmount = Number(editDraft.labourAmount) || 0;
    const partsAmount = Number(editDraft.partsAmount) || 0;
    const lineItemsTotal = normalizedLineItems.reduce((sum, item) => sum + item.price, 0);
    const updated: Job = {
      ...editDraft,
      customerName: editDraft.customerName.trim() || 'Customer',
      description: editDraft.description.trim(),
      lineItems: normalizedLineItems,
      labourAmount,
      partsAmount,
      total: labourAmount + partsAmount + lineItemsTotal,
    };
    saveJob(updated);
    refresh();
    setSelected(updated);
    setEditDraft(updated);
    setIsEditingSelected(false);
    toast.success(`${typeLabel(updated)} updated`);
  };

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
    if (isEditingSelected && editDraft) {
      const isInvoiceDraft = (editDraft.type || 'quote') === 'invoice';
      const editLineItemsTotal = (editDraft.lineItems || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      const draftTotal = (Number(editDraft.labourAmount) || 0) + (Number(editDraft.partsAmount) || 0) + editLineItemsTotal;
      return (
        <div className="min-h-screen bg-background px-4 py-6 pb-24">
          <button onClick={() => setIsEditingSelected(false)} className="text-lg font-bold text-primary mb-4">
            ← Back
          </button>
          <div className="rounded-2xl bg-card border border-input p-5 space-y-3">
            <h2 className="text-2xl font-black text-foreground">Edit {typeLabel(selected)}</h2>
            <input
              value={editDraft.customerName}
              onChange={e => setEditDraft(prev => prev ? { ...prev, customerName: e.target.value } : prev)}
              placeholder="Customer Name"
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <textarea
              value={editDraft.description}
              onChange={e => setEditDraft(prev => prev ? { ...prev, description: e.target.value } : prev)}
              rows={2}
              placeholder="Job Description"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={editDraft.location}
              onChange={e => setEditDraft(prev => prev ? { ...prev, location: e.target.value } : prev)}
              placeholder="Location"
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
            />
            <div className="grid grid-cols-1 gap-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {(editDraft.type || 'quote') === 'invoice' ? 'Invoice date' : 'Quote date'}
                </span>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(editDraft.createdAt)}
                  onChange={e => {
                    const iso = fromDateTimeLocalValue(e.target.value);
                    if (!iso) return;
                    setEditDraft(prev => prev ? { ...prev, createdAt: iso } : prev);
                  }}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                />
              </label>
              {isInvoiceDraft && (
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Payment date (when marked paid)</span>
                  <input
                    type="date"
                    value={toDateOnlyValue(editDraft.paidAt)}
                    onChange={e => {
                      const dateOnly = e.target.value;
                      setEditDraft(prev => prev ? { ...prev, paidAt: dateOnly || undefined } : prev);
                    }}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
                    disabled={editDraft.status !== 'Paid'}
                  />
                </label>
              )}
              {isInvoiceDraft && editDraft.status !== 'Paid' && (
                <p className="text-xs text-muted-foreground">
                  Payment date is enabled once invoice status is Paid.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={editDraft.labourAmount}
                onChange={e => setEditDraft(prev => prev ? { ...prev, labourAmount: Number(e.target.value) || 0 } : prev)}
                placeholder="Labour R"
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <input
                type="number"
                value={editDraft.partsAmount}
                onChange={e => setEditDraft(prev => prev ? { ...prev, partsAmount: Number(e.target.value) || 0 } : prev)}
                placeholder="Parts R"
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="rounded-xl border border-input bg-background p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Line Items</p>
                <button
                  onClick={() => setEditDraft(prev => prev ? { ...prev, lineItems: [...(prev.lineItems || []), { name: '', price: 0 }] } : prev)}
                  className="px-2 py-1 rounded-md bg-muted text-xs font-bold"
                >
                  + Add
                </button>
              </div>
              {(editDraft.lineItems || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No extra line items yet.</p>
              ) : (
                (editDraft.lineItems || []).map((item, idx) => (
                  <div key={`edit-line-item-${idx}`} className="grid grid-cols-[1fr_100px_34px] gap-2 items-center">
                    <input
                      value={item.name}
                      onChange={e => setEditDraft(prev => prev ? {
                        ...prev,
                        lineItems: (prev.lineItems || []).map((entry, entryIdx) => entryIdx === idx ? { ...entry, name: e.target.value } : entry),
                      } : prev)}
                      placeholder="Item name"
                      className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={e => setEditDraft(prev => prev ? {
                        ...prev,
                        lineItems: (prev.lineItems || []).map((entry, entryIdx) => entryIdx === idx ? { ...entry, price: Number(e.target.value) || 0 } : entry),
                      } : prev)}
                      placeholder="Price"
                      className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
                    />
                    <button
                      onClick={() => setEditDraft(prev => prev ? {
                        ...prev,
                        lineItems: (prev.lineItems || []).filter((_, entryIdx) => entryIdx !== idx),
                      } : prev)}
                      className="h-9 rounded-lg bg-destructive/10 text-destructive font-black"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            <p className="text-right text-xl font-black text-foreground">Total: R {draftTotal.toFixed(2)}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsEditingSelected(false)}
                className="h-11 rounded-xl bg-muted text-foreground text-sm font-black"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="h-11 rounded-xl bg-primary text-primary-foreground text-sm font-black"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      );
    }

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
            {(selected.lineItems || []).map((item, idx) => (
              <div key={`${selected.id}-item-${idx}`} className="flex justify-between">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-bold">R {item.price.toFixed(2)}</span>
              </div>
            ))}
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
            <button
              onClick={() => startEditing(selected)}
              className="w-full h-14 rounded-2xl bg-muted text-foreground text-lg font-black active:scale-[0.96] transition-transform"
            >
              ✏️ Edit {typeLabel(selected)}
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
