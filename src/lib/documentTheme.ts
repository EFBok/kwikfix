import { Company } from '@/types/kwikfix';

export interface DocumentTheme {
  headerBg: string;
  badgeBg: string;
  footerBg: string;
  cardBg: string;
  totalColor: string;
  fontFamily: string;
  sectionGap: number;
}

function withAlpha(hexColor: string, alphaHex: string): string {
  return `${hexColor}${alphaHex}`;
}

export function getDocumentTheme(company: Company): DocumentTheme {
  const brand = company.brandColor || '#2563eb';
  const template = company.template || 'clean';

  if (template === 'bold') {
    return {
      headerBg: `linear-gradient(90deg, ${withAlpha(brand, 'd9')} 0%, ${withAlpha(brand, '99')} 100%)`,
      badgeBg: withAlpha(brand, '66'),
      footerBg: withAlpha(brand, '33'),
      cardBg: '#ffffff',
      totalColor: brand,
      fontFamily: 'Inter, system-ui, sans-serif',
      sectionGap: 12,
    };
  }

  if (template === 'modern') {
    return {
      headerBg: `linear-gradient(120deg, ${withAlpha(brand, '1f')} 0%, ${withAlpha(brand, '66')} 50%, ${withAlpha(brand, '14')} 100%)`,
      badgeBg: withAlpha(brand, '52'),
      footerBg: `linear-gradient(90deg, ${withAlpha(brand, '0f')} 0%, ${withAlpha(brand, '33')} 100%)`,
      cardBg: '#ffffff',
      totalColor: brand,
      fontFamily: 'Poppins, Inter, system-ui, sans-serif',
      sectionGap: 14,
    };
  }

  if (template === 'custom') {
    const style = company.customBrandStyle;
    const primary = style?.palette?.primary || brand;
    const secondary = style?.palette?.secondary || withAlpha(brand, '66');
    const accent = style?.palette?.accent || withAlpha(brand, '33');
    const fontFamily = style?.fontFamily === 'Merriweather'
      ? 'Merriweather, Georgia, serif'
      : style?.fontFamily === 'Poppins'
        ? 'Poppins, Inter, system-ui, sans-serif'
        : 'Inter, system-ui, sans-serif';
    const sectionGap = style?.spacing === 'airy' ? 18 : style?.spacing === 'compact' ? 8 : 13;
    const headerBg = style?.layout === 'split'
      ? `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`
      : style?.layout === 'stripe'
        ? `repeating-linear-gradient(45deg, ${withAlpha(primary, '22')} 0px, ${withAlpha(primary, '22')} 12px, ${withAlpha(secondary, '22')} 12px, ${withAlpha(secondary, '22')} 24px)`
        : style?.style === 'premium'
          ? `linear-gradient(90deg, ${withAlpha(primary, '4a')} 0%, ${withAlpha(secondary, '52')} 100%)`
          : style?.style === 'editorial'
            ? withAlpha(primary, '24')
            : withAlpha(primary, '18');
    return {
      headerBg,
      badgeBg: withAlpha(accent, '66'),
      footerBg: withAlpha(secondary, '30'),
      cardBg: '#ffffff',
      totalColor: primary,
      fontFamily,
      sectionGap,
    };
  }

  return {
    headerBg: withAlpha(brand, '12'),
    badgeBg: withAlpha(brand, '20'),
    footerBg: withAlpha(brand, '08'),
    cardBg: '#ffffff',
    totalColor: brand,
    fontFamily: 'Inter, system-ui, sans-serif',
    sectionGap: 10,
  };
}

