import type {
  AuditCategoryScore,
  AuditVerdict,
  BrandGuideline,
  BrandGuidelineVersion,
  ContentChannel,
  GuidelineStatus,
  LockConfig,
  Role,
  SocialContent,
} from '../types/studio';

export type RbacAction =
  | 'VIEW_WORKSPACE'
  | 'CREATE_CLIENT'
  | 'EDIT_WORKSPACE'
  | 'UPLOAD_DOCUMENT'
  | 'RUN_EXTRACTION'
  | 'EDIT_GUIDELINE'
  | 'APPROVE_GUIDELINE'
  | 'GENERATE_CREATIVE'
  | 'GENERATE_SOCIAL'
  | 'RUN_VISUAL_AUDIT'
  | 'EDIT_STUDIO_LOCK'
  | 'MANAGE_WALLET'
  | 'MANAGE_ADMIN'
  | 'MANAGE_ROLES';

const ROLE_CAPABILITIES: Record<Role, Set<RbacAction>> = {
  ADMIN: new Set<RbacAction>([
    'VIEW_WORKSPACE',
    'CREATE_CLIENT',
    'EDIT_WORKSPACE',
    'UPLOAD_DOCUMENT',
    'RUN_EXTRACTION',
    'EDIT_GUIDELINE',
    'APPROVE_GUIDELINE',
    'GENERATE_CREATIVE',
    'GENERATE_SOCIAL',
    'RUN_VISUAL_AUDIT',
    'EDIT_STUDIO_LOCK',
    'MANAGE_WALLET',
    'MANAGE_ADMIN',
    'MANAGE_ROLES',
  ]),
  PM: new Set<RbacAction>([
    'VIEW_WORKSPACE',
    'EDIT_WORKSPACE',
    'UPLOAD_DOCUMENT',
    'RUN_EXTRACTION',
    'EDIT_GUIDELINE',
    'APPROVE_GUIDELINE',
    'GENERATE_CREATIVE',
    'GENERATE_SOCIAL',
    'RUN_VISUAL_AUDIT',
    'EDIT_STUDIO_LOCK',
    'MANAGE_WALLET',
  ]),
  VISUAL_MAKER: new Set<RbacAction>([
    'VIEW_WORKSPACE',
    'GENERATE_CREATIVE',
    'GENERATE_SOCIAL',
    'RUN_VISUAL_AUDIT',
    'EDIT_STUDIO_LOCK',
  ]),
  VIDEO_MAKER: new Set<RbacAction>([
    'VIEW_WORKSPACE',
    'EDIT_STUDIO_LOCK',
  ]),
};

export function hasRolePermission(
  role: Role,
  action: RbacAction,
  clientId?: string,
  assignedClientIds?: string[]
): boolean {
  const allowed = ROLE_CAPABILITIES[role]?.has(action) ?? false;
  if (!allowed) return false;
  if (role === 'ADMIN') return true;
  if (clientId && assignedClientIds && assignedClientIds.length > 0) {
    return assignedClientIds.includes(clientId);
  }
  return true;
}

export function canTransitionGuidelineState(
  current: GuidelineStatus,
  next: GuidelineStatus,
  role: Role
): boolean {
  if (current === next) return false;
  if (next === 'APPROVED' || next === 'ARCHIVED') {
    if (role !== 'ADMIN' && role !== 'PM') return false;
  }
  if (current === 'DRAFT' && (next === 'REVIEW' || next === 'APPROVED')) {
    return next === 'REVIEW' || role === 'ADMIN' || role === 'PM';
  }
  if (current === 'REVIEW' && (next === 'APPROVED' || next === 'DRAFT')) {
    return next === 'DRAFT' || role === 'ADMIN' || role === 'PM';
  }
  if (current === 'APPROVED' && (next === 'ARCHIVED' || next === 'DRAFT')) {
    return true;
  }
  if (current === 'ARCHIVED' && next === 'DRAFT') {
    return role === 'ADMIN' || role === 'PM';
  }
  return false;
}

export function getApprovedGuidelineVersion(
  guideline?: BrandGuideline | null
): BrandGuidelineVersion | null {
  if (!guideline || !guideline.versions || guideline.versions.length === 0) {
    return null;
  }
  if (guideline.activeVersionId) {
    const active = guideline.versions.find(
      (v) => v.id === guideline.activeVersionId && v.status === 'APPROVED'
    );
    if (active) return active;
  }
  const approved = [...guideline.versions]
    .filter((v) => v.status === 'APPROVED')
    .sort((a, b) => b.versionNumber - a.versionNumber);
  return approved[0] ?? null;
}

export function calculateVisualAuditScore(categories: AuditCategoryScore[]): {
  overallScore: number;
  earnedPoints: number;
  maxAssessablePoints: number;
  verdict: AuditVerdict;
  assessableCount: number;
} {
  let earnedPoints = 0;
  let maxAssessablePoints = 0;
  let assessableCount = 0;

  for (const cat of categories) {
    if (cat.assessable && cat.earnedPoints !== null && cat.maxPoints > 0) {
      const clamped = Math.max(0, Math.min(cat.maxPoints, cat.earnedPoints));
      earnedPoints += clamped;
      maxAssessablePoints += cat.maxPoints;
      assessableCount += 1;
    }
  }

  if (maxAssessablePoints <= 0) {
    return {
      overallScore: 0,
      earnedPoints: 0,
      maxAssessablePoints: 0,
      verdict: 'OFF BRAND',
      assessableCount: 0,
    };
  }

  const overallScore = Math.round((earnedPoints / maxAssessablePoints) * 100);
  let verdict: AuditVerdict = 'OFF BRAND';
  if (overallScore >= 80) {
    verdict = 'ON BRAND';
  } else if (overallScore >= 55) {
    verdict = 'NEEDS REVISION';
  }

  return {
    overallScore,
    earnedPoints,
    maxAssessablePoints,
    verdict,
    assessableCount,
  };
}

export function isolateByClient<T extends { clientId: string }>(
  items: T[],
  clientId: string
): T[] {
  return items.filter((item) => item.clientId === clientId);
}

export function buildBrandLockedPrompt(params: {
  baseVisualPrompt: string;
  textOverlay: string;
  locks: LockConfig;
  approvedGuideline: BrandGuidelineVersion | null;
  channelPreset?: ContentChannel | null;
}): {
  illustrationPrompt: string;
  textOverlaySpec: string;
  negativeDirectives: string;
  injectedGuidelineVersion: number | null;
} {
  const { baseVisualPrompt, textOverlay, locks, approvedGuideline, channelPreset } = params;
  const segments: string[] = [];

  if (baseVisualPrompt.trim()) {
    segments.push(`[SCENE VISUAL]: ${baseVisualPrompt.trim()}`);
  }

  if (locks.characterLock && locks.characterRef) {
    segments.push(`[CHARACTER LOCK]: ${locks.characterRef}`);
  }
  if (locks.setLock && locks.setRef) {
    segments.push(`[SET LOCK]: ${locks.setRef}`);
  }
  if (locks.styleLock && locks.styleRef) {
    segments.push(`[STYLE LOCK]: ${locks.styleRef}`);
  } else if (channelPreset?.visualStyle) {
    segments.push(`[CHANNEL STYLE]: ${channelPreset.visualStyle}`);
  }
  if (locks.productLock && locks.productRef) {
    segments.push(`[PRODUCT LOCK]: ${locks.productRef}`);
  }

  let injectedGuidelineVersion: number | null = null;
  if (approvedGuideline && approvedGuideline.status === 'APPROVED') {
    injectedGuidelineVersion = approvedGuideline.versionNumber;

    if (locks.brandLock) {
      const palette = approvedGuideline.swatches
        .map((s) => `${s.name} (${s.hex})`)
        .join(', ');
      segments.push(
        `[BRAND LOCK v${approvedGuideline.versionNumber}]: Palette: ${palette}. Photography: ${approvedGuideline.sections.photography}. Illustration: ${approvedGuideline.sections.illustration}.`
      );
    }
    if (locks.logoLock) {
      segments.push(`[LOGO LOCK]: ${approvedGuideline.sections.logoSystem}`);
    }
    if (locks.typographyLock) {
      const fontList = approvedGuideline.fonts
        .map((f) => `${f.tier}: ${f.fontFamily} (${f.weights})`)
        .join(' | ');
      segments.push(`[TYPOGRAPHY LOCK]: ${fontList}. ${approvedGuideline.sections.typography}`);
    }
    if (locks.visualIdentityLock) {
      segments.push(
        `[VISUAL IDENTITY LOCK]: Composition: ${approvedGuideline.sections.composition}. DOs: ${approvedGuideline.sections.dosList.join('; ')}`
      );
    }
  }

  if (channelPreset?.safeZoneSpec) {
    segments.push(`[SAFE ZONE]: ${channelPreset.safeZoneSpec}`);
  }

  const baseNegatives = [
    'Do not render red frame borders or slicing guides into final images',
    'Separate AI image illustration from text overlay rendering (keep text overlay layer clean)',
    'No distorted anatomy, no unapproved watermarks',
  ];
  if (channelPreset?.negativeDirectives) {
    baseNegatives.push(channelPreset.negativeDirectives);
  }
  if (locks.brandLock && approvedGuideline?.status === 'APPROVED' && approvedGuideline.sections.dontsList.length > 0) {
    baseNegatives.push(`Brand DON'Ts: ${approvedGuideline.sections.dontsList.join('; ')}`);
  }

  const textOverlaySpec = textOverlay.trim()
    ? `Overlay Layer (rendered outside AI image): "${textOverlay.trim()}"${
        locks.typographyLock && approvedGuideline?.status === 'APPROVED'
          ? ` using ${approvedGuideline.fonts.map((f) => f.fontFamily).join(' / ')}`
          : ''
      }`
    : 'No text overlay rendered in illustration prompt.';

  return {
    illustrationPrompt: segments.join('\n\n'),
    textOverlaySpec,
    negativeDirectives: baseNegatives.join(' | '),
    injectedGuidelineVersion,
  };
}

function escapeCsvCell(value: string): string {
  const safe = value.replaceAll('"', '""');
  return `"${safe}"`;
}

export function exportSocialPlanToCsv(items: SocialContent[]): string {
  const headers = [
    'ID',
    'Client ID',
    'Brand ID',
    'Guideline Version',
    'Campaign',
    'Content Pillar',
    'Platform',
    'Format',
    'Scheduled Date',
    'Status',
    'Hook',
    'Headline',
    'Caption',
    'Hashtags',
    'CTA',
    'Visual Prompt',
  ];
  const rows = items.map((item) =>
    [
      item.id,
      item.clientId,
      item.brandId,
      item.guidelineVersionId ?? 'UNLINKED',
      item.campaignName,
      item.contentPillar,
      item.platform,
      item.format,
      item.scheduledDate,
      item.status,
      item.hook,
      item.headline,
      item.caption,
      item.hashtags.join(' '),
      item.cta,
      item.visualPrompt,
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function exportSocialPlanToMarkdown(items: SocialContent[], brandName: string): string {
  const lines: string[] = [
    `# Social Media Production Plan — ${brandName}`,
    '',
    `Total Items: ${items.length}`,
    '',
  ];

  for (const item of items) {
    lines.push(`## ${item.scheduledDate} · ${item.platform} (${item.format}) — ${item.headline}`);
    lines.push(`- **Status:** ${item.status}`);
    lines.push(`- **Campaign:** ${item.campaignName} | **Pillar:** ${item.contentPillar}`);
    lines.push(`- **Hook:** ${item.hook}`);
    lines.push(`- **Caption:** ${item.caption}`);
    lines.push(`- **CTA:** ${item.cta}`);
    lines.push(`- **Hashtags:** ${item.hashtags.join(' ')}`);
    if (item.carouselSlides.length > 0) {
      lines.push(`- **Carousel Slides:**`);
      item.carouselSlides.forEach((s, idx) => lines.push(`  ${idx + 1}. ${s}`));
    }
    if (item.videoScript) {
      lines.push(`- **Video Script:** ${item.videoScript}`);
    }
    lines.push(`- **Visual Prompt:** ${item.visualPrompt}`);
    lines.push('');
  }

  return lines.join('\n');
}
