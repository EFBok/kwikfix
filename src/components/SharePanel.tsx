import { useState } from 'react';
import { Job, AVAILABLE_SHARE_APPS, ShareApp } from '@/types/kwikfix';
import { getCompany, getProSettings } from '@/store/kwikfix-store';
import { toast } from 'sonner';
import { buildDocumentPdfBlob } from '@/lib/pdfBuilder';

interface Props {
  job: Job;
  onClose?: () => void;
}

function buildShareText(job: Job, companyName: string): string {
  const docType = (job.type || 'quote') === 'invoice' ? 'Invoice' : 'Quote';
  const lineItemsText = (job.lineItems || []).map(item => `${item.name}: R ${item.price.toFixed(2)}`);
  return [
    `${docType} from ${companyName}`,
    `Customer: ${job.customerName}`,
    `Description: ${job.description}`,
    `Labour: R ${job.labourAmount.toFixed(2)}`,
    `Parts: R ${job.partsAmount.toFixed(2)}`,
    ...lineItemsText,
    `Total: R ${job.total.toFixed(2)}`,
    job.location ? `Location: ${job.location}` : '',
    '',
    'Sent via KwikFix',
  ].filter(Boolean).join('\n');
}

export default function SharePanel({ job, onClose }: Props) {
  const company = getCompany();
  const proSettings = getProSettings();
  const companyData = company || {
    logo: null,
    name: 'KwikFix',
    brandColor: '#2563eb',
    template: 'clean' as const,
  };
  const companyName = companyData.name;
  const enabledApps = company?.shareApps || ['whatsapp', 'email'];
  const quickSendAppId = proSettings.quickSendApp || 'whatsapp';
  const shareText = buildShareText(job, companyName);
  const docType = (job.type || 'quote') === 'invoice' ? 'Invoice' : 'Quote';
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileName = `${docType.toLowerCase()}-${job.customerName.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  const buildPdfFile = async (): Promise<File> => {
    const proSettings = getProSettings();
    const blob = await buildDocumentPdfBlob(job, companyData, proSettings);
    return new File([blob], fileName, { type: 'application/pdf' });
  };

  const downloadPdf = (pdfFile: File) => {
    const href = URL.createObjectURL(pdfFile);
    const link = document.createElement('a');
    link.href = href;
    link.download = pdfFile.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  const handleAppShare = async (app: ShareApp) => {
    setIsGeneratingPdf(true);
    const pdfFile = await buildPdfFile();
    setIsGeneratingPdf(false);

    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `${docType} from ${companyName}`,
          text: shareText,
          files: [pdfFile],
        });
        return;
      } catch {
        // user cancelled or unsupported runtime path
      }
    }

    downloadPdf(pdfFile);
    const encoded = encodeURIComponent(`${shareText}\n\n${docType} PDF downloaded (${pdfFile.name}). Please attach it to this message.`);
    const subject = encodeURIComponent(`${docType} from ${companyName}`);
    const url = app.urlTemplate
      .replace('{text}', encoded)
      .replace('{subject}', subject)
      .replace('{url}', encodeURIComponent(window.location.href));
    window.open(url, '_blank');
    toast.success(`${docType} PDF generated`);
  };

  const handleNativeShare = async () => {
    setIsGeneratingPdf(true);
    const pdfFile = await buildPdfFile();
    setIsGeneratingPdf(false);

    if (navigator.share) {
      try {
        if (navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({
            title: `${docType} from ${companyName}`,
            text: shareText,
            files: [pdfFile],
          });
        } else {
          await navigator.share({
            title: `${docType} from ${companyName}`,
            text: shareText,
          });
          downloadPdf(pdfFile);
        }
      } catch {
        // user cancelled
      }
    } else {
      downloadPdf(pdfFile);
      await navigator.clipboard.writeText(`${shareText}\n\nAttached file: ${pdfFile.name}`);
      toast.success('PDF downloaded and text copied to clipboard!');
    }
  };

  const activeApps = AVAILABLE_SHARE_APPS.filter(a => enabledApps.includes(a.id));
  const quickSendApp = activeApps.find(a => a.id === quickSendAppId) || activeApps[0];
  const secondaryApps = activeApps.filter(a => a.id !== quickSendApp?.id);

  return (
    <div className="space-y-3">
      {/* Quick send button */}
      {quickSendApp && (
        <button
          onClick={() => handleAppShare(quickSendApp)}
          className="w-full h-14 rounded-2xl bg-secondary text-secondary-foreground text-lg font-black active:scale-[0.96] transition-transform flex items-center justify-center gap-2"
        >
          <span className="text-xl">{quickSendApp.icon}</span>
          {isGeneratingPdf ? 'Generating PDF...' : `Quick Send via ${quickSendApp.label}`}
        </button>
      )}

      {/* Other app buttons */}
      {secondaryApps.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {secondaryApps.map(app => (
            <button
              key={app.id}
              onClick={() => handleAppShare(app)}
              className="h-16 rounded-2xl bg-card border border-input flex items-center justify-center gap-2 text-lg font-bold text-foreground active:scale-[0.96] transition-transform"
            >
              <span className="text-2xl">{app.icon}</span>
              {app.label}
            </button>
          ))}
        </div>
      )}

      {/* Generic share / copy */}
      <button
        onClick={async () => {
          setIsGeneratingPdf(true);
          const pdfFile = await buildPdfFile();
          setIsGeneratingPdf(false);
          downloadPdf(pdfFile);
          toast.success(`${docType} PDF downloaded`);
        }}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold active:scale-[0.96] transition-transform flex items-center justify-center gap-2"
      >
        <span className="text-xl">📄</span>
        {isGeneratingPdf ? 'Generating PDF...' : `Download ${docType} PDF`}
      </button>

      <button
        onClick={handleNativeShare}
        className="w-full h-14 rounded-2xl bg-muted text-foreground text-lg font-bold active:scale-[0.96] transition-transform flex items-center justify-center gap-2"
      >
        <span className="text-xl">📤</span>
        {navigator.share ? `Share ${docType} PDF` : 'Copy Text + Download PDF'}
      </button>
    </div>
  );
}
