import { Company } from '@/types/kwikfix';

function normalizeHex(value: string): string {
  const raw = value.trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash : '#2563eb';
}

function shiftColor(hex: string, shift: number): string {
  const input = normalizeHex(hex).replace('#', '');
  const num = Number.parseInt(input, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 255) + shift);
  const g = clamp(((num >> 8) & 255) + shift);
  const b = clamp((num & 255) + shift);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function pickPalette(seed: string, base: string) {
  if (seed.includes('luxury') || seed.includes('premium')) {
    return { primary: '#1f2937', secondary: '#111827', accent: '#d4af37', text: '#111111' };
  }
  if (seed.includes('playful') || seed.includes('vibrant')) {
    return { primary: '#7c3aed', secondary: '#db2777', accent: '#f59e0b', text: '#1f2937' };
  }
  if (seed.includes('nature') || seed.includes('organic')) {
    return { primary: '#166534', secondary: '#15803d', accent: '#65a30d', text: '#1f2937' };
  }
  return {
    primary: base,
    secondary: shiftColor(base, -20),
    accent: shiftColor(base, 28),
    text: '#1f2937',
  };
}

export function generateAiBrandStyle(prompt: string, currentBrandColor: string): Pick<Company, 'template' | 'brandColor' | 'customBrandStyle'> {
  const text = prompt.toLowerCase();

  const fontFamily =
    text.includes('classic') || text.includes('luxury') || text.includes('serif')
      ? 'Merriweather'
      : text.includes('friendly') || text.includes('modern') || text.includes('rounded')
        ? 'Poppins'
        : 'Inter';

  const spacing =
    text.includes('spacious') || text.includes('airy')
      ? 'airy'
      : text.includes('tight') || text.includes('compact')
        ? 'compact'
        : 'balanced';

  const style =
    text.includes('premium') || text.includes('luxury')
      ? 'premium'
      : text.includes('editorial') || text.includes('magazine')
        ? 'editorial'
        : 'minimal';

  const layout =
    text.includes('split') || text.includes('two column')
      ? 'split'
      : text.includes('card') || text.includes('blocks')
        ? 'card'
        : text.includes('stripe') || text.includes('sidebar')
          ? 'stripe'
          : 'classic';

  let suggestedColor = normalizeHex(currentBrandColor);
  if (text.includes('warm')) suggestedColor = shiftColor(suggestedColor, 18);
  if (text.includes('cool')) suggestedColor = shiftColor(suggestedColor, -12);
  if (text.includes('dark')) suggestedColor = shiftColor(suggestedColor, -30);
  if (text.includes('red')) suggestedColor = '#dc2626';
  if (text.includes('blue')) suggestedColor = '#2563eb';
  if (text.includes('green')) suggestedColor = '#059669';
  if (text.includes('orange')) suggestedColor = '#ea580c';
  if (text.includes('purple')) suggestedColor = '#7c3aed';
  const palette = pickPalette(text, suggestedColor);

  return {
    template: 'custom',
    brandColor: suggestedColor,
    customBrandStyle: {
      prompt: prompt.trim(),
      fontFamily,
      spacing,
      style,
      layout,
      palette,
    },
  };
}

