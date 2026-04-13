import { useRef } from 'react';
import { Company, Job } from '@/types/kwikfix';
import { getCompany } from '@/store/kwikfix-store';
import { getDocumentTheme } from '@/lib/documentTheme';

interface Props {
  job: Job;
  previewRef?: React.RefObject<HTMLDivElement>;
  companyOverride?: Company;
}

export default function QuotePreview({ job, previewRef, companyOverride }: Props) {
  const company = companyOverride || (getCompany() as Company) || {
    logo: null,
    name: 'KwikFix',
    brandColor: '#2563eb',
    template: 'clean' as const,
  };
  const theme = getDocumentTheme(company);
  const docType = (job.type || 'quote') === 'invoice' ? 'INVOICE' : 'QUOTE';
  const date = new Date(job.createdAt).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div
      ref={previewRef}
      className="rounded-2xl border border-input bg-card overflow-hidden"
      style={{ fontFamily: theme.fontFamily, background: theme.cardBg }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: theme.headerBg }}
      >
        <div className="flex items-center gap-3">
          {company.logo && (
            <img src={company.logo} alt="" className="h-10 w-10 rounded-lg object-contain" />
          )}
          <div>
            <p className="text-lg font-black" style={{ color: company.brandColor }}>
              {company.name}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className="text-xs font-black tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: theme.badgeBg, color: company.brandColor }}
          >
            {docType}
          </span>
          <p className="text-xs text-muted-foreground mt-1">{date}</p>
        </div>
      </div>

      {/* Photo */}
      {job.photo && (
        <img src={job.photo} alt="Job" className="w-full h-36 object-cover" />
      )}

      {/* Body */}
      <div className="px-5 py-4" style={{ rowGap: theme.sectionGap }}>
        <p className="text-sm text-muted-foreground mb-0.5">Customer</p>
        <p className="text-lg font-bold text-foreground" style={{ marginBottom: theme.sectionGap }}>{job.customerName}</p>

        <p className="text-sm text-muted-foreground mb-0.5">Description</p>
        <p className="text-base text-foreground" style={{ marginBottom: theme.sectionGap }}>{job.description}</p>

        {job.location && (
          <>
            <p className="text-sm text-muted-foreground mb-0.5">Location</p>
            <p className="text-sm text-foreground" style={{ marginBottom: theme.sectionGap }}>📍 {job.location}</p>
          </>
        )}

        {/* Totals */}
        <div className="border-t border-input pt-3 mt-2 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Labour</span>
            <span className="font-semibold text-foreground">R {job.labourAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Parts</span>
            <span className="font-semibold text-foreground">R {job.partsAmount.toFixed(2)}</span>
          </div>
          {(job.lineItems || []).map((item, idx) => (
            <div key={`${job.id || 'preview'}-line-item-${idx}`} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-semibold text-foreground">R {item.price.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-input pt-2 flex justify-between text-xl font-black">
            <span>Total</span>
            <span style={{ color: theme.totalColor }}>R {job.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3 text-center text-xs text-muted-foreground"
        style={{ background: theme.footerBg }}
      >
        Powered by KwikFix
      </div>
    </div>
  );
}
