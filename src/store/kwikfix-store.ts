import { Company, Job, ProSettings } from '@/types/kwikfix';

const COMPANY_KEY = 'kwikfix_company';
const JOBS_KEY = 'kwikfix_jobs';
const PRO_SETTINGS_KEY = 'kwikfix_pro_settings';

export function getCompany(): Company | null {
  const data = localStorage.getItem(COMPANY_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveCompany(company: Company) {
  localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
}

export function getJobs(): Job[] {
  const data = localStorage.getItem(JOBS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveJob(job: Job) {
  const jobs = getJobs();
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.unshift(job);
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

export function getDefaultProSettings(): ProSettings {
  return {
    developerMode: false,
    theme: 'light',
    disableKwikFixWatermark: false,
    userProfile: {
      fullName: '',
      email: '',
      phone: '',
    },
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      branchCode: '',
      accountType: '',
    },
    paymentIntegrations: {
      enablePayFast: false,
      payFastMerchantId: '',
      enableStripe: false,
      stripePublishableKey: '',
      customPaymentLink: '',
    },
  };
}

export function getProSettings(): ProSettings {
  const data = localStorage.getItem(PRO_SETTINGS_KEY);
  if (!data) return getDefaultProSettings();
  const parsed = JSON.parse(data) as Partial<ProSettings>;
  const defaults = getDefaultProSettings();
  return {
    ...defaults,
    ...parsed,
    userProfile: {
      ...defaults.userProfile,
      ...(parsed.userProfile || {}),
    },
    bankDetails: {
      ...defaults.bankDetails,
      ...(parsed.bankDetails || {}),
    },
    paymentIntegrations: {
      ...defaults.paymentIntegrations,
      ...(parsed.paymentIntegrations || {}),
    },
  };
}

export function saveProSettings(settings: ProSettings) {
  localStorage.setItem(PRO_SETTINGS_KEY, JSON.stringify(settings));
}

export function initSampleData() {
  if (getJobs().length > 0) return;
  const samples: Job[] = [
    {
      id: 'sample-1',
      photo: null,
      voiceText: 'Fix leaking kitchen tap and replace washer',
      customerName: 'Sarah Johnson',
      description: 'Fix leaking kitchen tap and replace washer',
      labourAmount: 450,
      partsAmount: 120,
      total: 570,
      location: '12 Oak Street, Sandton',
      status: 'Sent',
      type: 'quote',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'sample-2',
      photo: null,
      voiceText: 'Install new outdoor light fitting at front door',
      customerName: 'Mike Peters',
      description: 'Install new outdoor light fitting at front door',
      labourAmount: 350,
      partsAmount: 280,
      total: 630,
      location: '45 Main Road, Bryanston',
      status: 'Paid',
      type: 'invoice',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'sample-3',
      photo: null,
      voiceText: 'Unblock bathroom drain and check pipes',
      customerName: 'Linda Nkosi',
      description: 'Unblock bathroom drain and check pipes',
      labourAmount: 300,
      partsAmount: 80,
      total: 380,
      location: '8 Acacia Ave, Randburg',
      status: 'Sent',
      type: 'quote',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ];
  localStorage.setItem(JOBS_KEY, JSON.stringify(samples));
}
