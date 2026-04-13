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
    quickSendApp: 'whatsapp',
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
    reportStartingIncome: 0,
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
      id: 'inv-2026-q1-01',
      photo: null,
      voiceText: 'Install new kitchen mixer tap and fittings',
      customerName: 'Sarah Johnson',
      description: 'Install new kitchen mixer tap and test pressure',
      labourAmount: 900,
      partsAmount: 450,
      total: 1350,
      location: '12 Oak Street, Sandton',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-01-04T09:30:00.000Z',
      paidAt: '2026-01-06',
    },
    {
      id: 'inv-2026-q1-02',
      photo: null,
      voiceText: 'Replace geyser thermostat and safety valve',
      customerName: 'Mike Peters',
      description: 'Replace geyser thermostat and safety valve',
      labourAmount: 1200,
      partsAmount: 780,
      total: 1980,
      location: '45 Main Road, Bryanston',
      status: 'Sent',
      type: 'invoice',
      createdAt: '2026-01-08T10:45:00.000Z',
    },
    {
      id: 'inv-2026-q1-03',
      photo: null,
      voiceText: 'Unblock main bathroom drain and inspect trap',
      customerName: 'Linda Nkosi',
      description: 'Unblock bathroom drain and inspect waste line',
      labourAmount: 700,
      partsAmount: 180,
      total: 880,
      location: '8 Acacia Ave, Randburg',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-01-12T08:15:00.000Z',
      paidAt: '2026-01-14',
    },
    {
      id: 'inv-2026-q1-04',
      photo: null,
      voiceText: 'Repair DB board tripping issue',
      customerName: 'Jason Molefe',
      description: 'Diagnose and repair DB board tripping issue',
      labourAmount: 1500,
      partsAmount: 920,
      total: 2420,
      location: '22 Pine Crescent, Midrand',
      status: 'Sent',
      type: 'invoice',
      createdAt: '2026-01-18T13:20:00.000Z',
    },
    {
      id: 'inv-2026-q1-05',
      photo: null,
      voiceText: 'Install 2 outdoor LED flood lights',
      customerName: 'Zanele Dube',
      description: 'Install and wire two outdoor LED flood lights',
      labourAmount: 980,
      partsAmount: 640,
      total: 1620,
      location: '71 Cedar Road, Fourways',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-01-25T11:10:00.000Z',
      paidAt: '2026-01-28',
    },
    {
      id: 'inv-2026-q1-06',
      photo: null,
      voiceText: 'Replace leaking basin trap and tailpiece',
      customerName: 'Ayesha Khan',
      description: 'Replace leaking basin trap and reseal fittings',
      labourAmount: 620,
      partsAmount: 210,
      total: 830,
      location: '3 Willow Lane, Centurion',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-02-02T09:00:00.000Z',
      paidAt: '2026-02-03',
    },
    {
      id: 'inv-2026-q1-07',
      photo: null,
      voiceText: 'Ceiling fan install in lounge',
      customerName: 'Pieter Venter',
      description: 'Install and balance ceiling fan in lounge',
      labourAmount: 860,
      partsAmount: 1200,
      total: 2060,
      location: '90 Kingfisher Blvd, Roodepoort',
      status: 'Sent',
      type: 'invoice',
      createdAt: '2026-02-06T15:30:00.000Z',
    },
    {
      id: 'inv-2026-q1-08',
      photo: null,
      voiceText: 'Toilet cistern flush valve replacement',
      customerName: 'Nokuthula Mthembu',
      description: 'Replace flush valve and service toilet cistern',
      labourAmount: 540,
      partsAmount: 260,
      total: 800,
      location: '18 Sunbird Street, Kempton Park',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-02-10T07:40:00.000Z',
      paidAt: '2026-02-12',
    },
    {
      id: 'inv-2026-q1-09',
      photo: null,
      voiceText: 'Install prepaid meter and circuit protection',
      customerName: 'Thabo Mokoena',
      description: 'Install prepaid meter with protection components',
      labourAmount: 1800,
      partsAmount: 1500,
      total: 3300,
      location: '55 Elm Drive, Soweto',
      status: 'Sent',
      type: 'invoice',
      createdAt: '2026-02-14T12:05:00.000Z',
    },
    {
      id: 'inv-2026-q1-10',
      photo: null,
      voiceText: 'Leak detection and pipe reroute in ceiling',
      customerName: 'Grace Daniels',
      description: 'Locate ceiling leak and reroute section of pipe',
      labourAmount: 1450,
      partsAmount: 560,
      total: 2010,
      location: '10 Mountain View, Pretoria',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-02-21T10:20:00.000Z',
      paidAt: '2026-02-24',
    },
    {
      id: 'inv-2026-q1-11',
      photo: null,
      voiceText: 'Replace damaged plug points in kitchen',
      customerName: 'Ruan Bezuidenhout',
      description: 'Replace damaged kitchen plug points and test',
      labourAmount: 780,
      partsAmount: 300,
      total: 1080,
      location: '39 River Road, Benoni',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-03-01T09:50:00.000Z',
      paidAt: '2026-03-02',
    },
    {
      id: 'inv-2026-q1-12',
      photo: null,
      voiceText: 'Install pressure reducing valve on main line',
      customerName: 'Emma Naidoo',
      description: 'Install PRV and check pressure readings',
      labourAmount: 930,
      partsAmount: 480,
      total: 1410,
      location: '7 Coral Street, Durban North',
      status: 'Sent',
      type: 'invoice',
      createdAt: '2026-03-07T14:25:00.000Z',
    },
    {
      id: 'inv-2026-q1-13',
      photo: null,
      voiceText: 'Gate motor battery and sensor replacement',
      customerName: 'Sipho Khumalo',
      description: 'Replace gate motor battery and safety sensors',
      labourAmount: 1100,
      partsAmount: 950,
      total: 2050,
      location: '64 Palm Close, Durbanville',
      status: 'Paid',
      type: 'invoice',
      createdAt: '2026-03-12T08:35:00.000Z',
      paidAt: '2026-03-15',
    },
    {
      id: 'inv-2026-q1-14',
      photo: null,
      voiceText: 'Rewire outdoor plugs and waterproof boxes',
      customerName: 'Lebo Ramaila',
      description: 'Rewire outdoor plugs and replace waterproof boxes',
      labourAmount: 1320,
      partsAmount: 740,
      total: 2060,
      location: '2 Magnolia Way, Polokwane',
      status: 'Sent',
      type: 'invoice',
      createdAt: '2026-03-19T16:00:00.000Z',
    },
    {
      id: 'inv-2026-q1-15',
      photo: null,
      voiceText: 'Service sump pump and float switch',
      customerName: 'Carla Smith',
      description: 'Service sump pump and replace faulty float switch',
      labourAmount: 990,
      partsAmount: 520,
      total: 1510,
      location: '101 Meadow Lane, Bellville',
      status: 'Sent',
      type: 'invoice',
      createdAt: '2026-03-26T11:55:00.000Z',
    },
  ];
  localStorage.setItem(JOBS_KEY, JSON.stringify(samples));
}
