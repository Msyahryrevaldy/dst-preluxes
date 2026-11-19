export type Language = 'id' | 'en';

export type Role = 'ADMIN' | 'PM' | 'VISUAL_MAKER' | 'VIDEO_MAKER';

export type GuidelineStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED';

export type EvidenceStatus = 'VERIFIED' | 'AI_SUGGESTION' | 'CONFLICT' | 'NOT_VERIFIED';

export type SocialPlatform = 'Instagram' | 'TikTok' | 'Facebook' | 'LinkedIn';

export type SocialContentStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED';

export type AuditSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export type AuditVerdict = 'ON BRAND' | 'NEEDS REVISION' | 'OFF BRAND';

export type ActiveRoute =
  | 'workshop'
  | 'dompet'
  | 'brief'
  | 'studio'
  | 'video'
  | 'bantuan'
  | 'admin'
  | 'brand-workspace'
  | 'brand-intelligence'
  | 'brand-guidelines'
  | 'creative-direction'
  | 'social-studio'
  | 'visual-checker'
  | 'brand-reports'
  | 'website';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignedClientIds: string[];
  avatarUrl: string;
  title: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  code: string;
  industry: string;
  active: boolean;
  monthlyVideoTarget: number;
  monthlyVideoCompleted: number;
  defaultChannelId: string;
}

export interface BrandWorkspace {
  id: string;
  clientId: string;
  brandName: string;
  companyProfile: string;
  industry: string;
  targetAudience: string;
  productsServices: string;
  mission: string;
  vision: string;
  positioning: string;
  uvp: string;
  brandLibraryFolderId?: string;
  brandLibraryFolderName?: string;
  primaryColorPreview: string;
  secondaryColorPreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandAsset {
  id: string;
  brandId: string;
  clientId: string;
  name: string;
  category: 'LOGO' | 'PHOTO' | 'ILLUSTRATION' | 'DOCUMENT' | 'KEY_VISUAL';
  mimeType: string;
  sizeBytes: number;
  url: string;
  driveFileId?: string;
  driveFolderId?: string;
  driveStorageMode: 'LOCAL_CACHE' | 'GOOGLE_DRIVE';
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface BrandEvidence {
  id: string;
  categoryCode:
    | 'A_IDENTITY'
    | 'B_MISSION_VISION'
    | 'C_PRODUCTS'
    | 'D_AUDIENCE'
    | 'E_PERSONALITY'
    | 'F_VALUES'
    | 'G_LOGO'
    | 'H_COLORS'
    | 'I_TYPOGRAPHY'
    | 'J_PHOTO_ILLUSTRATION'
    | 'K_GRAPHIC_LAYOUT'
    | 'L_TONE'
    | 'M_TAGLINE_MESSAGING'
    | 'N_DOS_DONTS';
  label: string;
  extractedValue: string;
  sourceDocument: string;
  pageReference: string;
  confidence: number;
  status: EvidenceStatus;
  conflictingSources?: string[];
  approvedBy?: string;
  approvedAt?: string;
}

export interface BrandSwatch {
  id: string;
  name: string;
  hex: string;
  role: 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'NEUTRAL';
  usageRule: string;
  verified: boolean;
}

export interface BrandFontRule {
  id: string;
  tier: 'DISPLAY' | 'HEADING' | 'BODY' | 'MONO';
  fontFamily: string;
  weights: string;
  usageNote: string;
  verified: boolean;
}

export interface BrandGuidelineSections {
  brandIdentity: string;
  logoSystem: string;
  colorSystem: string;
  typography: string;
  photography: string;
  illustration: string;
  composition: string;
  toneOfVoice: string;
  messaging: string;
  dosList: string[];
  dontsList: string[];
}

export interface BrandGuidelineVersion {
  id: string;
  brandId: string;
  clientId: string;
  versionNumber: number;
  status: GuidelineStatus;
  sections: BrandGuidelineSections;
  swatches: BrandSwatch[];
  fonts: BrandFontRule[];
  logoGallery: Array<{ id: string; label: string; url: string; variant: string }>;
  referenceGallery: Array<{ id: string; label: string; url: string; note: string }>;
  evidences: BrandEvidence[];
  changeSummary: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface BrandGuideline {
  brandId: string;
  clientId: string;
  activeVersionId: string | null;
  versions: BrandGuidelineVersion[];
}

export interface CreativeConcept {
  conceptTitle: string;
  campaignName: string;
  creativeConcept: string;
  bigIdea: string;
  strategicRationale: string;
  artDirection: string;
  visualDirection: string;
  moodboardBrief: string;
  colorDirection: string;
  typographyDirection: string;
  photographyDirection: string;
  composition: string;
  headlines: string[];
  cta: string;
  aiImagePrompts: string[];
  designerProductionBrief: string;
}

export interface CreativeDirection {
  id: string;
  brandId: string;
  clientId: string;
  guidelineVersionId: string | null;
  campaignObjective: string;
  targetAudience: string;
  product: string;
  platform: string;
  mainMessage: string;
  duration: string;
  emotion: string;
  format: string;
  concepts: CreativeConcept[];
  selectedConceptIndex: number;
  status: 'DRAFT' | 'APPROVED' | 'SENT_TO_BRIEF' | 'SENT_TO_STUDIO';
  createdBy: string;
  createdAt: string;
}

export interface ContentCampaign {
  id: string;
  brandId: string;
  clientId: string;
  guidelineVersionId: string | null;
  name: string;
  horizonDays: 7 | 14 | 30;
  platforms: SocialPlatform[];
  contentPillars: string[];
  strategySummary: string;
  createdAt: string;
}

export interface SocialContent {
  id: string;
  clientId: string;
  brandId: string;
  guidelineVersionId: string | null;
  campaignId: string;
  campaignName: string;
  contentPillar: string;
  platform: SocialPlatform;
  format: 'Carousel' | 'Reels / Short Video' | 'Single Image' | 'Thread / Article';
  scheduledDate: string;
  status: SocialContentStatus;
  hook: string;
  headline: string;
  caption: string;
  hashtags: string[];
  cta: string;
  carouselSlides: string[];
  videoScript: string;
  sceneBreakdown: string[];
  visualPrompt: string;
  editorialNotes?: string;
}

export interface AuditCategoryScore {
  key: 'logo' | 'color' | 'typography' | 'imagery' | 'messaging' | 'layout';
  label: string;
  maxPoints: number;
  earnedPoints: number | null;
  assessable: boolean;
  reason?: string;
}

export interface AuditViolation {
  id: string;
  category: string;
  rule: string;
  severity: AuditSeverity;
  evidence: string;
  recommendation: string;
}

export interface VisualAudit {
  id: string;
  brandId: string;
  clientId: string;
  guidelineVersionId: string | null;
  assetName: string;
  imageDataUrl: string;
  categories: AuditCategoryScore[];
  overallScore: number;
  passedRules: string[];
  violations: AuditViolation[];
  verdict: AuditVerdict;
  summary: string;
  auditedBy: string;
  auditedAt: string;
}

export interface BrandActivityLog {
  id: string;
  clientId: string;
  brandId?: string;
  actor: string;
  role: Role;
  action: string;
  target: string;
  timestamp: string;
}

export interface ContentChannel {
  id: string;
  name: string;
  clientId: string;
  platform: string;
  visualStyle: string;
  characterLockPreset: string;
  sceneStructure: string;
  safeZoneSpec: string;
  negativeDirectives: string;
  targetMonthly: number;
  producedMonthly: number;
}

export interface BriefItem {
  id: string;
  clientId: string;
  brandId: string;
  channelId: string;
  title: string;
  objective: string;
  targetAudience: string;
  keyMessage: string;
  deliverableFormat: string;
  dueDate: string;
  status: 'NEW' | 'IN_PROGRESS' | 'IN_STUDIO' | 'DONE';
  sourceCreativeId?: string;
  sourceSocialId?: string;
}

export interface LockConfig {
  characterLock: boolean;
  characterRef: string;
  setLock: boolean;
  setRef: string;
  styleLock: boolean;
  styleRef: string;
  productLock: boolean;
  productRef: string;
  brandLock: boolean;
  logoLock: boolean;
  typographyLock: boolean;
  visualIdentityLock: boolean;
}

export interface SceneCard {
  id: string;
  sceneNumber: number;
  title: string;
  durationSec: number;
  visualDescription: string;
  textOverlay: string;
  voiceover: string;
  compiledPrompt: string;
  flowJobStatus?: 'IDLE' | 'SUBMITTED' | 'PROVIDER_UNCONFIGURED' | 'FAILED';
  flowJobMessage?: string;
}

export interface StudioBoard {
  id: string;
  clientId: string;
  brandId: string;
  channelId: string;
  briefId?: string;
  title: string;
  locks: LockConfig;
  scenes: SceneCard[];
  updatedAt: string;
}

export interface VideoTimestampNote {
  id: string;
  timecode: string;
  seconds: number;
  author: string;
  comment: string;
  resolved: boolean;
  createdAt: string;
}

export interface VideoVersion {
  id: string;
  versionLabel: string;
  url: string;
  uploadedAt: string;
  notes: string;
  durationLabel: string;
}

export interface VideoDeliverable {
  id: string;
  clientId: string;
  brandId: string;
  channelId: string;
  title: string;
  status: 'REVIEW' | 'REVISION' | 'READY_TO_POST' | 'PUBLISHED';
  driveReadyToPostFolderId: string;
  activeVersionId: string;
  versions: VideoVersion[];
  feedback: VideoTimestampNote[];
}

export interface WalletTransaction {
  id: string;
  clientId: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amountIdr: number;
  date: string;
  status: 'PAID' | 'PENDING';
}

export interface SystemConfig {
  geminiModel: 'gemini-4-hydrogen' | 'gemini-4-argon' | 'gemini-4-carbon' | 'gemini-3.1-flash-lite';
  googleFlowProjectId: string;
  googleFlowEndpointUrl: string;
  readyToPostFolderId: string;
  brandLibraryRootFolderName: string;
  brandLibraryRootFolderId?: string;
}

export interface StudioStoreState {
  schemaVersion: number;
  language: Language;
  activeUserId: string;
  activeClientId: string;
  users: UserAccount[];
  clients: ClientRecord[];
  workspaces: BrandWorkspace[];
  assets: BrandAsset[];
  guidelines: Record<string, BrandGuideline>;
  creativeDirections: CreativeDirection[];
  campaigns: ContentCampaign[];
  socialContents: SocialContent[];
  visualAudits: VisualAudit[];
  activityLogs: BrandActivityLog[];
  channels: ContentChannel[];
  briefs: BriefItem[];
  studioBoards: StudioBoard[];
  videos: VideoDeliverable[];
  walletTransactions: WalletTransaction[];
  systemConfig: SystemConfig;
}
