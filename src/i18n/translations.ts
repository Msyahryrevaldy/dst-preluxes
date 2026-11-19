import type { Language } from '../types/studio';

export const TRANSLATIONS: Record<
  Language,
  {
    appTitle: string;
    appSubtitle: string;
    coreSection: string;
    brandSection: string;
    nav: {
      workshop: string;
      dompet: string;
      brief: string;
      studio: string;
      video: string;
      bantuan: string;
      admin: string;
      brandWorkspace: string;
      brandIntelligence: string;
      brandGuidelines: string;
      creativeDirection: string;
      socialStudio: string;
      visualChecker: string;
      brandReports: string;
      website: string;
    };
    header: {
      activeClient: string;
      roleLabel: string;
      driveConnected: string;
      driveSignIn: string;
      driveDisconnect: string;
    };
    workshop: {
      title: string;
      subtitle: string;
      monthlyTarget: string;
      readyToPostHub: string;
      openReadyToPost: string;
      organizeReadyToPost: string;
      brandOverviewTitle: string;
      activeBrands: string;
      uploadedDocs: string;
      approvedGuidelines: string;
      creativeCampaigns: string;
      contentGenerated: string;
      productionTasks: string;
      visualAudits: string;
      avgCompliance: string;
      recentActivity: string;
      filterAllClients: string;
    };
    common: {
      save: string;
      cancel: string;
      approve: string;
      reject: string;
      submitReview: string;
      generate: string;
      exportCsv: string;
      exportMarkdown: string;
      loading: string;
      noPermission: string;
      confirmDriveTitle: string;
      confirmDriveProceed: string;
      verified: string;
      aiSuggestion: string;
      conflict: string;
      notVerified: string;
      notAssessable: string;
    };
  }
> = {
  id: {
    appTitle: 'Studio DST',
    appSubtitle: 'V11 · Brand Intelligence',
    coreSection: 'PRODUKSI STUDIO',
    brandSection: 'BRAND INTELLIGENCE',
    nav: {
      workshop: 'Workshop Saya',
      dompet: 'Dompet',
      brief: 'Brief',
      studio: 'Studio',
      video: 'Video',
      bantuan: 'Pusat Bantuan',
      admin: 'Admin',
      brandWorkspace: 'Brand Workspace',
      brandIntelligence: 'Brand Intelligence',
      brandGuidelines: 'Brand Guidelines',
      creativeDirection: 'Creative Direction',
      socialStudio: 'Social Media Studio',
      visualChecker: 'Visual Consistency Checker',
      brandReports: 'Brand Reports',
      website: 'Website',
    },
    header: {
      activeClient: 'Klien Aktif',
      roleLabel: 'Peran',
      driveConnected: 'Google Drive Terhubung',
      driveSignIn: 'Masuk dengan Google',
      driveDisconnect: 'Putus Drive',
    },
    workshop: {
      title: 'Workshop Saya & Ikhtisar Brand Intelligence',
      subtitle: 'Ringkasan target produksi bulanan, hub Ready To Post, dan tata kelola merek lintas klien.',
      monthlyTarget: 'Target Produksi Video Bulanan',
      readyToPostHub: 'Hub Google Drive · Ready To Post',
      openReadyToPost: 'Muat Isi Folder Ready To Post',
      organizeReadyToPost: 'Rencanakan Organisasi Autopost AI',
      brandOverviewTitle: 'Metrik Brand Intelligence',
      activeBrands: 'Brand Aktif',
      uploadedDocs: 'Dokumen & Aset',
      approvedGuidelines: 'Pedoman Disetujui',
      creativeCampaigns: 'Kampanye Kreatif',
      contentGenerated: 'Konten Sosial',
      productionTasks: 'Tugas Studio & Brief',
      visualAudits: 'Audit Visual',
      avgCompliance: 'Rata-Rata Kepatuhan',
      recentActivity: 'Aktivitas Terbaru',
      filterAllClients: 'Semua Klien',
    },
    common: {
      save: 'Simpan',
      cancel: 'Batal',
      approve: 'Setujui',
      reject: 'Tolak',
      submitReview: 'Ajukan Review',
      generate: 'Hasilkan dengan AI',
      exportCsv: 'Ekspor CSV',
      exportMarkdown: 'Ekspor Markdown',
      loading: 'Memproses...',
      noPermission: 'Peran Anda saat ini tidak memiliki izin untuk tindakan ini.',
      confirmDriveTitle: 'Konfirmasi Perubahan Google Drive',
      confirmDriveProceed: 'Konfirmasi & Jalankan',
      verified: 'TERVERIFIKASI',
      aiSuggestion: 'SARAN AI',
      conflict: 'KONFLIK DOKUMEN',
      notVerified: 'NOT VERIFIED',
      notAssessable: 'NOT ASSESSABLE',
    },
  },
  en: {
    appTitle: 'Studio DST',
    appSubtitle: 'V11 · Brand Intelligence',
    coreSection: 'STUDIO PRODUCTION',
    brandSection: 'BRAND INTELLIGENCE',
    nav: {
      workshop: 'Workshop Saya',
      dompet: 'Dompet',
      brief: 'Brief',
      studio: 'Studio',
      video: 'Video',
      bantuan: 'Pusat Bantuan',
      admin: 'Admin',
      brandWorkspace: 'Brand Workspace',
      brandIntelligence: 'Brand Intelligence',
      brandGuidelines: 'Brand Guidelines',
      creativeDirection: 'Creative Direction',
      socialStudio: 'Social Media Studio',
      visualChecker: 'Visual Consistency Checker',
      brandReports: 'Brand Reports',
      website: 'Website',
    },
    header: {
      activeClient: 'Active Client',
      roleLabel: 'Role',
      driveConnected: 'Google Drive Connected',
      driveSignIn: 'Sign in with Google',
      driveDisconnect: 'Disconnect Drive',
    },
    workshop: {
      title: 'My Workshop & Brand Intelligence Overview',
      subtitle: 'Monthly production targets, Ready To Post hub, and cross-client brand governance metrics.',
      monthlyTarget: 'Monthly Video Production Target',
      readyToPostHub: 'Google Drive Hub · Ready To Post',
      openReadyToPost: 'Load Ready To Post Folder',
      organizeReadyToPost: 'Plan AI Autopost Organization',
      brandOverviewTitle: 'Brand Intelligence Overview',
      activeBrands: 'Active Brands',
      uploadedDocs: 'Documents & Assets',
      approvedGuidelines: 'Approved Guidelines',
      creativeCampaigns: 'Creative Campaigns',
      contentGenerated: 'Social Content',
      productionTasks: 'Brief & Studio Tasks',
      visualAudits: 'Visual Audits',
      avgCompliance: 'Avg Compliance',
      recentActivity: 'Recent Activity',
      filterAllClients: 'All Clients',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      approve: 'Approve',
      reject: 'Reject',
      submitReview: 'Submit for Review',
      generate: 'Generate with AI',
      exportCsv: 'Export CSV',
      exportMarkdown: 'Export Markdown',
      loading: 'Processing...',
      noPermission: 'Your current role does not have permission for this action.',
      confirmDriveTitle: 'Confirm Google Drive Mutation',
      confirmDriveProceed: 'Confirm & Execute',
      verified: 'VERIFIED',
      aiSuggestion: 'AI SUGGESTION',
      conflict: 'DOCUMENT CONFLICT',
      notVerified: 'NOT VERIFIED',
      notAssessable: 'NOT ASSESSABLE',
    },
  },
};
