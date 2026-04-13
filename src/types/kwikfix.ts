export interface ShareApp {
  id: string;
  label: string;
  icon: string;
  urlTemplate: string; // use {text} and {url} placeholders
}

export const AVAILABLE_SHARE_APPS: ShareApp[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', urlTemplate: 'https://wa.me/?text={text}' },
  { id: 'email', label: 'Email', icon: '📧', urlTemplate: 'mailto:?subject={subject}&body={text}' },
  { id: 'sms', label: 'SMS', icon: '💬', urlTemplate: 'sms:?body={text}' },
  { id: 'telegram', label: 'Telegram', icon: '✈️', urlTemplate: 'https://t.me/share/url?url={url}&text={text}' },
];

export interface Company {
  logo: string | null;
  name: string;
  brandColor: string;
  template: 'clean' | 'bold' | 'modern' | 'custom';
  customBrandStyle?: {
    prompt: string;
    fontFamily: 'Inter' | 'Poppins' | 'Merriweather';
    spacing: 'compact' | 'balanced' | 'airy';
    style: 'minimal' | 'editorial' | 'premium';
    layout: 'classic' | 'split' | 'card' | 'stripe';
    palette: {
      primary: string;
      secondary: string;
      accent: string;
      text: string;
    };
  };
  shareApps?: string[]; // IDs of selected share apps
}

export interface Job {
  id: string;
  photo: string | null;
  voiceText: string;
  customerName: string;
  description: string;
  labourAmount: number;
  partsAmount: number;
  total: number;
  location: string;
  status: 'Draft' | 'Sent' | 'Paid';
  type: 'quote' | 'invoice';
  createdAt: string;
}

export interface UserProfileSettings {
  fullName: string;
  email: string;
  phone: string;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
}

export interface PaymentIntegrations {
  enablePayFast: boolean;
  payFastMerchantId: string;
  enableStripe: boolean;
  stripePublishableKey: string;
  customPaymentLink: string;
}

export interface ProSettings {
  developerMode: boolean;
  theme: 'light' | 'dark';
  disableKwikFixWatermark: boolean;
  userProfile: UserProfileSettings;
  bankDetails: BankDetails;
  paymentIntegrations: PaymentIntegrations;
}
