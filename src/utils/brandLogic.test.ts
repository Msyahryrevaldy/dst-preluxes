import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBrandLockedPrompt,
  calculateVisualAuditScore,
  canTransitionGuidelineState,
  exportSocialPlanToCsv,
  exportSocialPlanToMarkdown,
  getApprovedGuidelineVersion,
  hasRolePermission,
  isolateByClient,
} from './brandLogic';
import { migrateStudioStorage } from './storageMigration';
import type { BrandGuideline, BrandGuidelineVersion, SocialContent, StudioStoreState } from '../types/studio';

test('calculateVisualAuditScore recalculates proportionally when items are NOT ASSESSABLE', () => {
  const result = calculateVisualAuditScore([
    { key: 'logo', label: 'Logo usage', maxPoints: 20, earnedPoints: 18, assessable: true },
    { key: 'color', label: 'Color consistency', maxPoints: 25, earnedPoints: 22, assessable: true },
    { key: 'typography', label: 'Typography', maxPoints: 15, earnedPoints: null, assessable: false, reason: 'No text present' },
    { key: 'imagery', label: 'Imagery', maxPoints: 15, earnedPoints: 12, assessable: true },
    { key: 'messaging', label: 'Messaging', maxPoints: 15, earnedPoints: null, assessable: false, reason: 'Visual only' },
    { key: 'layout', label: 'Layout', maxPoints: 10, earnedPoints: 8, assessable: true },
  ]);
  // earned = 18+22+12+8 = 60, maxAssessable = 20+25+15+10 = 70 -> 60/70 = 85.7 -> 86
  assert.equal(result.maxAssessablePoints, 70);
  assert.equal(result.earnedPoints, 60);
  assert.equal(result.overallScore, 86);
  assert.equal(result.verdict, 'ON BRAND');
  assert.equal(result.assessableCount, 4);
});

test('calculateVisualAuditScore returns OFF BRAND when score < 55', () => {
  const result = calculateVisualAuditScore([
    { key: 'logo', label: 'Logo usage', maxPoints: 20, earnedPoints: 5, assessable: true },
    { key: 'color', label: 'Color consistency', maxPoints: 25, earnedPoints: 10, assessable: true },
  ]);
  assert.equal(result.overallScore, 33);
  assert.equal(result.verdict, 'OFF BRAND');
});

test('hasRolePermission enforces RBAC and client assignment isolation', () => {
  assert.equal(hasRolePermission('ADMIN', 'MANAGE_ROLES', 'client-2', []), true);
  assert.equal(hasRolePermission('PM', 'APPROVE_GUIDELINE', 'client-2', ['client-2']), true);
  assert.equal(hasRolePermission('PM', 'APPROVE_GUIDELINE', 'client-3', ['client-2']), false);
  assert.equal(hasRolePermission('VISUAL_MAKER', 'APPROVE_GUIDELINE', 'client-2', ['client-2']), false);
  assert.equal(hasRolePermission('VIDEO_MAKER', 'MANAGE_WALLET', 'client-2', ['client-2']), false);
  assert.equal(hasRolePermission('VIDEO_MAKER', 'EDIT_STUDIO_LOCK', 'client-2', ['client-2']), true);
});

test('canTransitionGuidelineState restricts approval to ADMIN and PM', () => {
  assert.equal(canTransitionGuidelineState('REVIEW', 'APPROVED', 'VISUAL_MAKER'), false);
  assert.equal(canTransitionGuidelineState('REVIEW', 'APPROVED', 'PM'), true);
  assert.equal(canTransitionGuidelineState('DRAFT', 'REVIEW', 'VISUAL_MAKER'), true);
  assert.equal(canTransitionGuidelineState('APPROVED', 'ARCHIVED', 'ADMIN'), true);
});

test('buildBrandLockedPrompt only injects APPROVED guidelines and enforces safe negatives', () => {
  const draftVersion: BrandGuidelineVersion = {
    id: 'v1',
    brandId: 'b1',
    clientId: 'c1',
    versionNumber: 1,
    status: 'DRAFT',
    sections: {
      brandIdentity: 'Draft Identity',
      logoSystem: 'Top left',
      colorSystem: 'Blue',
      typography: 'Jakarta',
      photography: 'Natural',
      illustration: 'Clean',
      composition: 'Grid',
      toneOfVoice: 'Direct',
      messaging: 'Clear',
      dosList: ['Keep clear space'],
      dontsList: ['Do not stretch logo'],
    },
    swatches: [{ id: 's1', name: 'DST Blue', hex: '#05349B', role: 'PRIMARY', usageRule: 'Primary', verified: true }],
    fonts: [{ id: 'f1', tier: 'DISPLAY', fontFamily: 'Plus Jakarta Sans', weights: '700', usageNote: 'Headlines', verified: true }],
    logoGallery: [],
    referenceGallery: [],
    evidences: [],
    changeSummary: 'Initial',
    createdBy: 'Admin',
    createdAt: '2026-01-01',
  };

  const guideline: BrandGuideline = { brandId: 'b1', clientId: 'c1', activeVersionId: 'v1', versions: [draftVersion] };
  assert.equal(getApprovedGuidelineVersion(guideline), null);

  const lockedDraft = buildBrandLockedPrompt({
    baseVisualPrompt: 'Modern office desk',
    textOverlay: 'Headline Here',
    locks: {
      characterLock: true,
      characterRef: 'Host in navy jacket',
      setLock: false,
      setRef: '',
      styleLock: false,
      styleRef: '',
      productLock: false,
      productRef: '',
      brandLock: true,
      logoLock: true,
      typographyLock: true,
      visualIdentityLock: true,
    },
    approvedGuideline: getApprovedGuidelineVersion(guideline),
  });
  assert.equal(lockedDraft.injectedGuidelineVersion, null);
  assert.ok(!lockedDraft.illustrationPrompt.includes('[BRAND LOCK'));

  const approvedVersion: BrandGuidelineVersion = { ...draftVersion, status: 'APPROVED' };
  const lockedApproved = buildBrandLockedPrompt({
    baseVisualPrompt: 'Modern office desk',
    textOverlay: 'Headline Here',
    locks: {
      characterLock: true,
      characterRef: 'Host in navy jacket',
      setLock: false,
      setRef: '',
      styleLock: false,
      styleRef: '',
      productLock: false,
      productRef: '',
      brandLock: true,
      logoLock: true,
      typographyLock: true,
      visualIdentityLock: true,
    },
    approvedGuideline: approvedVersion,
  });
  assert.equal(lockedApproved.injectedGuidelineVersion, 1);
  assert.ok(lockedApproved.illustrationPrompt.includes('#05349B'));
  assert.ok(lockedApproved.illustrationPrompt.includes('[CHARACTER LOCK]'));
  assert.ok(lockedApproved.negativeDirectives.includes('Do not render red frame borders'));
});

test('isolateByClient prevents cross-client leakage', () => {
  const data = [
    { id: '1', clientId: 'dst-internal', title: 'A' },
    { id: '2', clientId: 'antikorupsi', title: 'B' },
  ];
  const filtered = isolateByClient(data, 'antikorupsi');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'B');
});

test('CSV and Markdown exporters format social content deterministically', () => {
  const items: SocialContent[] = [
    {
      id: 'sc1',
      clientId: 'c1',
      brandId: 'b1',
      guidelineVersionId: 'v1',
      campaignId: 'cmp1',
      campaignName: 'Launch Q4',
      contentPillar: 'Education',
      platform: 'Instagram',
      format: 'Carousel',
      scheduledDate: '2026-11-20',
      status: 'APPROVED',
      hook: 'Stop guessing brand colors',
      headline: 'Brand System 101',
      caption: 'Consistency builds trust.',
      hashtags: ['#Branding', '#DST'],
      cta: 'Save this post',
      carouselSlides: ['Slide 1: Cover', 'Slide 2: Palette'],
      videoScript: '',
      sceneBreakdown: [],
      visualPrompt: 'Clean studio flatlay',
    },
  ];
  const csv = exportSocialPlanToCsv(items);
  assert.ok(csv.includes('"Launch Q4"'));
  assert.ok(csv.includes('"Instagram"'));

  const md = exportSocialPlanToMarkdown(items, 'DST Internal');
  assert.ok(md.includes('# Social Media Production Plan — DST Internal'));
  assert.ok(md.includes('1. Slide 1: Cover'));
});

test('migrateStudioStorage preserves legacy user data and upgrades schemaVersion to 10', () => {
  const seed = {
    schemaVersion: 10,
    language: 'id',
    activeUserId: 'u1',
    activeClientId: 'dst-internal',
    users: [],
    clients: [{ id: 'dst-internal', name: 'DST Internal', code: 'DST', industry: 'Agency', active: true, monthlyVideoTarget: 10, monthlyVideoCompleted: 2, defaultChannelId: 'ch1' }],
    workspaces: [],
    assets: [],
    guidelines: {},
    creativeDirections: [],
    campaigns: [],
    socialContents: [],
    visualAudits: [],
    activityLogs: [],
    channels: [],
    briefs: [],
    studioBoards: [],
    videos: [],
    walletTransactions: [],
    systemConfig: {
      geminiModel: 'gemini-4-hydrogen',
      googleFlowProjectId: '0803359d-dab1-41ef-b3bf-398167349e36',
      googleFlowEndpointUrl: '',
      readyToPostFolderId: '1aEn3k_aXdmohkJN545ygm4HGhLbA-5qY',
      brandLibraryRootFolderName: 'Studio DST - Brand Library',
    },
  } as StudioStoreState;

  const legacy = {
    schemaVersion: 9,
    walletTransactions: [{ id: 'tx1', clientId: 'dst-internal', type: 'EXPENSE', category: 'Render', description: 'GPU', amountIdr: 500000, date: '2026-11-01', status: 'PAID' }],
    clients: [{ id: 'custom-client', name: 'Custom Legacy Client', code: 'CLC', industry: 'Retail', active: true, monthlyVideoTarget: 5, monthlyVideoCompleted: 1, defaultChannelId: 'ch1' }],
  };

  const { state, migratedFromVersion } = migrateStudioStorage(legacy, seed);
  assert.equal(migratedFromVersion, 9);
  assert.equal(state.schemaVersion, 10);
  assert.equal(state.walletTransactions.length, 1);
  assert.equal(state.workspaces.some((w) => w.clientId === 'custom-client'), true);
});
