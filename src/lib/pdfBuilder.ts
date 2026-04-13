import { jsPDF } from 'jspdf';
import { Company, Job, ProSettings } from '@/types/kwikfix';
import { getDocumentTheme } from '@/lib/documentTheme';

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const full = sanitized.length === 3
    ? sanitized.split('').map(char => `${char}${char}`).join('')
    : sanitized;
  const num = Number.parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mixWithWhite(hex: string, ratio: number): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.round(r + (255 - r) * ratio),
    Math.round(g + (255 - g) * ratio),
    Math.round(b + (255 - b) * ratio),
  ];
}

export async function buildDocumentPdfBlob(
  job: Job,
  companyData: Company,
  proSettings: ProSettings,
): Promise<Blob> {
  const docType = (job.type || 'quote') === 'invoice' ? 'Invoice' : 'Quote';
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const watermarkBottomMargin = 40;
  const marginX = 40;
  const [brandR, brandG, brandB] = hexToRgb(companyData.brandColor);
  const [lightR, lightG, lightB] = mixWithWhite(companyData.brandColor, 0.82);
  const [lighterR, lighterG, lighterB] = mixWithWhite(companyData.brandColor, 0.92);
  const customPalette = companyData.customBrandStyle?.palette;
  const [primaryR, primaryG, primaryB] = hexToRgb(customPalette?.primary || companyData.brandColor);
  const [secondaryR, secondaryG, secondaryB] = hexToRgb(customPalette?.secondary || '#1f2937');
  const [accentR, accentG, accentB] = hexToRgb(customPalette?.accent || '#f59e0b');
  const [textR, textG, textB] = hexToRgb(customPalette?.text || '#1f2937');
  const createdDate = new Date(job.createdAt).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const pdfFont = companyData.customBrandStyle?.fontFamily === 'Merriweather'
    ? 'times'
    : companyData.customBrandStyle?.fontFamily === 'Poppins'
      ? 'helvetica'
      : 'helvetica';
  const spacing = companyData.customBrandStyle?.spacing === 'airy'
    ? 18
    : companyData.customBrandStyle?.spacing === 'compact'
      ? 11
      : 14;
  const templateMode = companyData.template === 'custom'
    ? companyData.customBrandStyle?.layout || 'classic'
    : companyData.template;

  if (templateMode === 'bold') {
    pdf.setFillColor(brandR, brandG, brandB);
    pdf.rect(0, 0, pageWidth, 138, 'F');
    pdf.setFillColor(lightR, lightG, lightB);
    pdf.roundedRect(marginX, 92, pageWidth - marginX * 2, 40, 10, 10, 'F');
  } else if (templateMode === 'modern' || templateMode === 'split') {
    pdf.setFillColor(primaryR, primaryG, primaryB);
    pdf.rect(0, 0, pageWidth * 0.42, pageHeight, 'F');
    pdf.setFillColor(lightR, lightG, lightB);
    pdf.rect(pageWidth * 0.42, 0, pageWidth * 0.58, 105, 'F');
    pdf.setFillColor(lighterR, lighterG, lighterB);
    pdf.rect(pageWidth * 0.42, 105, pageWidth * 0.58, pageHeight - 105, 'F');
  } else if (templateMode === 'stripe') {
    for (let x = 0; x < pageWidth; x += 18) {
      const usePrimary = Math.floor(x / 18) % 2 === 0;
      pdf.setFillColor(usePrimary ? primaryR : secondaryR, usePrimary ? primaryG : secondaryG, usePrimary ? primaryB : secondaryB);
      pdf.rect(x, 0, 18, 86, 'F');
    }
  } else if (templateMode === 'card') {
    pdf.setFillColor(245, 245, 245);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(24, 22, pageWidth - 48, pageHeight - 44, 16, 16, 'F');
    pdf.setDrawColor(primaryR, primaryG, primaryB);
    pdf.setLineWidth(2);
    pdf.roundedRect(24, 22, pageWidth - 48, pageHeight - 44, 16, 16, 'S');
  } else {
    pdf.setFillColor(lighterR, lighterG, lighterB);
    pdf.rect(0, 0, pageWidth, 105, 'F');
  }

  const contentX = templateMode === 'modern' || templateMode === 'split' ? pageWidth * 0.45 : marginX;
  const contentWidth = pageWidth - contentX - marginX;

  if (companyData.logo) {
    try {
      const logoX = templateMode === 'modern' || templateMode === 'split' ? contentX : marginX;
      pdf.addImage(companyData.logo, 'PNG', logoX, 28, 42, 42);
    } catch {
      // ignore bad logo format
    }
  }

  const brandTextColor = templateMode === 'bold'
    ? [255, 255, 255]
    : templateMode === 'modern' || templateMode === 'split'
      ? [255, 255, 255]
      : [brandR, brandG, brandB];
  pdf.setTextColor(brandTextColor[0], brandTextColor[1], brandTextColor[2]);
  pdf.setFont(pdfFont, 'bold');
  pdf.setFontSize(templateMode === 'card' ? 20 : 18);
  const titleX = templateMode === 'modern' || templateMode === 'split' ? 34 : (companyData.logo ? contentX + 52 : contentX);
  pdf.text(companyData.name, titleX, 52);

  pdf.setFontSize(10);
  pdf.setTextColor(90, 90, 90);
  pdf.text(createdDate, pageWidth - marginX, 50, { align: 'right' });

  pdf.setFillColor(
    templateMode === 'card' ? accentR : templateMode === 'bold' ? secondaryR : brandR,
    templateMode === 'card' ? accentG : templateMode === 'bold' ? secondaryG : brandG,
    templateMode === 'card' ? accentB : templateMode === 'bold' ? secondaryB : brandB,
  );
  pdf.roundedRect(pageWidth - marginX - 110, 60, 110, 24, 6, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.text(docType.toUpperCase(), pageWidth - marginX - 55, 76, { align: 'center' });

  if (templateMode === 'bold') {
    pdf.setTextColor(brandR, brandG, brandB);
    pdf.setFont(pdfFont, 'bold');
    pdf.setFontSize(11);
    const customerLine = `Customer: ${job.customerName || 'Customer'}`;
    const clamped = pdf.splitTextToSize(customerLine, pageWidth - marginX * 2 - 20)[0] || customerLine;
    pdf.text(clamped, marginX + 10, 116);
  }

  let y = templateMode === 'bold' ? 174 : 140;
  pdf.setTextColor(textR, textG, textB);
  if (templateMode !== 'bold') {
    pdf.setFont(pdfFont, 'bold');
    pdf.setFontSize(12);
    pdf.text('Customer', contentX, y);
    pdf.setFont(pdfFont, 'normal');
    pdf.setFontSize(14);
    pdf.text(job.customerName || 'Customer', contentX, y + 20);
    y += 52;
  }
  pdf.setFont(pdfFont, 'bold');
  pdf.setFontSize(12);
  pdf.text('Description', contentX, y);
  pdf.setFont(pdfFont, 'normal');
  pdf.setFontSize(11);
  const descriptionLines = pdf.splitTextToSize(job.description || '-', contentWidth);
  pdf.text(descriptionLines, contentX, y + 18);

  y += 22 + descriptionLines.length * spacing;
  pdf.setFont(pdfFont, 'bold');
  pdf.setFontSize(12);
  pdf.text('Location', contentX, y);
  pdf.setFont(pdfFont, 'normal');
  pdf.setFontSize(11);
  const locationLines = pdf.splitTextToSize(job.location || '-', contentWidth);
  pdf.text(locationLines, contentX, y + 18);

  const totalsY = y + 34 + locationLines.length * spacing;
  pdf.setDrawColor(220, 220, 220);
  if (templateMode === 'card') {
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(contentX, totalsY - 12, contentWidth, 96, 10, 10, 'F');
  } else {
    pdf.line(contentX, totalsY, pageWidth - marginX, totalsY);
  }

  pdf.setFontSize(11);
  pdf.setTextColor(70, 70, 70);
  pdf.text('Labour', contentX + 10, totalsY + 24);
  pdf.text(`R ${job.labourAmount.toFixed(2)}`, pageWidth - marginX - 10, totalsY + 24, { align: 'right' });
  pdf.text('Parts', contentX + 10, totalsY + 44);
  pdf.text(`R ${job.partsAmount.toFixed(2)}`, pageWidth - marginX - 10, totalsY + 44, { align: 'right' });

  pdf.setDrawColor(220, 220, 220);
  if (templateMode !== 'card') {
    pdf.line(contentX, totalsY + 58, pageWidth - marginX, totalsY + 58);
  }
  const totalColor = customPalette?.primary ? [primaryR, primaryG, primaryB] : [brandR, brandG, brandB];
  pdf.setTextColor(totalColor[0], totalColor[1], totalColor[2]);
  pdf.setFont(pdfFont, 'bold');
  pdf.setFontSize(15);
  pdf.text('Total', contentX + 10, totalsY + 82);
  pdf.text(`R ${job.total.toFixed(2)}`, pageWidth - marginX - 10, totalsY + 82, { align: 'right' });

  const bankLines = [
    proSettings.bankDetails.bankName && `Bank: ${proSettings.bankDetails.bankName}`,
    proSettings.bankDetails.accountName && `Account Name: ${proSettings.bankDetails.accountName}`,
    proSettings.bankDetails.accountNumber && `Account Number: ${proSettings.bankDetails.accountNumber}`,
    proSettings.bankDetails.branchCode && `Branch Code: ${proSettings.bankDetails.branchCode}`,
    proSettings.bankDetails.accountType && `Account Type: ${proSettings.bankDetails.accountType}`,
  ].filter(Boolean) as string[];
  const paymentLines = [
    proSettings.paymentIntegrations.enableStripe && proSettings.paymentIntegrations.stripePublishableKey
      ? `Stripe: ${proSettings.paymentIntegrations.stripePublishableKey}`
      : '',
    proSettings.paymentIntegrations.enablePayFast && proSettings.paymentIntegrations.payFastMerchantId
      ? `PayFast: ${proSettings.paymentIntegrations.payFastMerchantId}`
      : '',
    proSettings.paymentIntegrations.customPaymentLink
      ? `Pay Link: ${proSettings.paymentIntegrations.customPaymentLink}`
      : '',
  ].filter(Boolean) as string[];

  const hasDetails = bankLines.length > 0 || paymentLines.length > 0;
  if (hasDetails) {
    const cardHeight = 120;
    const bottomReservedSpace = watermarkBottomMargin + 40;
    const cardY = pageHeight - cardHeight - bottomReservedSpace;
    const detailsY = cardY + 12;
    const cardX = contentX + 6;
    const cardWidth = contentWidth - 12;
    const fillColor =
      templateMode === 'bold'
        ? [lightR, lightG, lightB]
        : templateMode === 'stripe'
          ? [245, 247, 250]
          : [252, 252, 255];
    const borderColor =
      templateMode === 'card'
        ? [accentR, accentG, accentB]
        : templateMode === 'stripe'
          ? [primaryR, primaryG, primaryB]
          : [secondaryR, secondaryG, secondaryB];

    pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 12, 12, 'F');
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(1.2);
    pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 12, 12, 'S');
    if (templateMode === 'stripe') {
      pdf.setFillColor(primaryR, primaryG, primaryB);
      pdf.roundedRect(cardX, cardY, 7, cardHeight, 12, 12, 'F');
    }

    pdf.setTextColor(textR, textG, textB);
    pdf.setFont(pdfFont, 'bold');
    pdf.setFontSize(11);
    pdf.text('Payment Details', cardX + 14, detailsY + 6);

    pdf.setFont(pdfFont, 'normal');
    pdf.setFontSize(10);
    bankLines.forEach((line, idx) => {
      pdf.text(line, cardX + 14, detailsY + 24 + idx * 13);
    });
    paymentLines.forEach((line, idx) => {
      const rightX = templateMode === 'split' || templateMode === 'modern' ? cardX + cardWidth * 0.55 : cardX;
      const baseY = templateMode === 'split' || templateMode === 'modern'
        ? detailsY + 24 + idx * 13
        : detailsY + 24 + bankLines.length * 13 + 10 + idx * 13;
      pdf.text(line, rightX + 14, baseY);
    });
  }

  if (!proSettings.disableKwikFixWatermark) {
    const watermarkY = pageHeight - watermarkBottomMargin;
    pdf.setTextColor(130, 130, 130);
    pdf.setFont(pdfFont, 'bold');
    pdf.setFontSize(10);
    pdf.text('Powered by KwikFix', pageWidth / 2, watermarkY, { align: 'center' });
    pdf.setDrawColor(170, 170, 170);
    pdf.circle(pageWidth / 2 - 58, watermarkY - 3, 5);
    pdf.setFontSize(8);
    pdf.text('K', pageWidth / 2 - 58, watermarkY - 0.5, { align: 'center' });
  }

  return pdf.output('blob');
}

