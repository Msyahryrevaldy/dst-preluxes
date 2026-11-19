import { z } from 'zod';

const normalizeUpper = (val: unknown) =>
  typeof val === 'string' ? val.trim().toUpperCase().replace(/[\s-]+/g, '_') : val;

const normalizeSwatchRole = (val: unknown) => {
  const s = typeof val === 'string' ? val.trim().toUpperCase() : '';
  if (s === 'PRIMARY' || s === 'SECONDARY' || s === 'ACCENT' || s === 'NEUTRAL') return s;
  if (s.includes('PRIM')) return 'PRIMARY';
  if (s.includes('SEC')) return 'SECONDARY';
  if (s.includes('ACC') || s.includes('HIGHLIGHT')) return 'ACCENT';
  return 'NEUTRAL';
};

const normalizeFontTier = (val: unknown) => {
  const s = typeof val === 'string' ? val.trim().toUpperCase() : '';
  if (s === 'DISPLAY' || s === 'HEADING' || s === 'BODY' || s === 'MONO') return s;
  if (s.includes('DISP') || s.includes('TITLE')) return 'DISPLAY';
  if (s.includes('HEAD') || s.includes('SUB')) return 'HEADING';
  if (s.includes('MONO') || s.includes('CODE')) return 'MONO';
  return 'BODY';
};

const normalizePlatform = (val: unknown) => {
  const s = typeof val === 'string' ? val.trim().toLowerCase() : '';
  if (s.includes('tik')) return 'TikTok';
  if (s.includes('face') || s === 'fb') return 'Facebook';
  if (s.includes('link')) return 'LinkedIn';
  return 'Instagram';
};

const normalizeFormat = (val: unknown) => {
  const s = typeof val === 'string' ? val.trim().toLowerCase() : '';
  if (s.includes('carou') || s.includes('slide')) return 'Carousel';
  if (s.includes('reel') || s.includes('video') || s.includes('short') || s.includes('tiktok')) {
    return 'Reels / Short Video';
  }
  if (s.includes('thread') || s.includes('articl') || s.includes('text')) return 'Thread / Article';
  return 'Single Image';
};

const normalizeSeverity = (val: unknown) => {
  const s = typeof val === 'string' ? val.trim().toUpperCase() : '';
  if (s === 'CRITICAL' || s === 'MAJOR' || s === 'MINOR') return s;
  if (s.includes('HIGH') || s.includes('CRIT') || s.includes('SEVERE')) return 'CRITICAL';
  if (s.includes('MED') || s.includes('MAJ') || s.includes('WARN')) return 'MAJOR';
  return 'MINOR';
};

export const BrandExtractionItemSchema = z.object({
  categoryCode: z.enum([
    'A_IDENTITY',
    'B_MISSION_VISION',
    'C_PRODUCTS',
    'D_AUDIENCE',
    'E_PERSONALITY',
    'F_VALUES',
    'G_LOGO',
    'H_COLORS',
    'I_TYPOGRAPHY',
    'J_PHOTO_ILLUSTRATION',
    'K_GRAPHIC_LAYOUT',
    'L_TONE',
    'M_TAGLINE_MESSAGING',
    'N_DOS_DONTS',
  ]),
  label: z.string(),
  extractedValue: z.string(),
  sourceDocument: z.string(),
  pageReference: z.string(),
  confidence: z.number().min(0).max(1),
  status: z.preprocess(
    normalizeUpper,
    z.enum(['VERIFIED', 'AI_SUGGESTION', 'CONFLICT', 'NOT_VERIFIED'])
  ),
  conflictingSources: z.array(z.string()).optional(),
});

export const BrandExtractionResultSchema = z.object({
  summary: z.string(),
  evidences: z.array(BrandExtractionItemSchema),
  suggestedSwatches: z.array(
    z.object({
      name: z.string(),
      hex: z.string(),
      role: z.preprocess(normalizeSwatchRole, z.enum(['PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL'])),
      usageRule: z.string(),
      verified: z.boolean(),
    })
  ),
  suggestedFonts: z.array(
    z.object({
      tier: z.preprocess(normalizeFontTier, z.enum(['DISPLAY', 'HEADING', 'BODY', 'MONO'])),
      fontFamily: z.string(),
      weights: z.string(),
      usageNote: z.string(),
      verified: z.boolean(),
    })
  ),
});

export const CreativeConceptSchema = z.object({
  conceptTitle: z.string(),
  campaignName: z.string(),
  creativeConcept: z.string(),
  bigIdea: z.string(),
  strategicRationale: z.string(),
  artDirection: z.string(),
  visualDirection: z.string(),
  moodboardBrief: z.string(),
  colorDirection: z.string(),
  typographyDirection: z.string(),
  photographyDirection: z.string(),
  composition: z.string(),
  headlines: z.array(z.string()),
  cta: z.string(),
  aiImagePrompts: z.array(z.string()),
  designerProductionBrief: z.string(),
});

export const CreativeGenerationResultSchema = z.object({
  concepts: z.array(CreativeConceptSchema).min(1),
});

export const SocialContentGeneratedItemSchema = z.object({
  platform: z.preprocess(normalizePlatform, z.enum(['Instagram', 'TikTok', 'Facebook', 'LinkedIn'])),
  format: z.preprocess(
    normalizeFormat,
    z.enum(['Carousel', 'Reels / Short Video', 'Single Image', 'Thread / Article'])
  ),
  contentPillar: z.string(),
  dayOffset: z.number().int().min(1).max(30),
  hook: z.string(),
  headline: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string(),
  carouselSlides: z.array(z.string()),
  videoScript: z.string(),
  sceneBreakdown: z.array(z.string()),
  visualPrompt: z.string(),
});

export const SocialPlanResultSchema = z.object({
  strategySummary: z.string(),
  contentPillars: z.array(z.string()),
  items: z.array(SocialContentGeneratedItemSchema).min(1),
});

export const VisualAuditCategorySchema = z.object({
  key: z.enum(['logo', 'color', 'typography', 'imagery', 'messaging', 'layout']),
  label: z.string(),
  maxPoints: z.number(),
  earnedPoints: z.number().nullable(),
  assessable: z.boolean(),
  reason: z.string().optional(),
});

export const VisualAuditResultSchema = z.object({
  categories: z.array(VisualAuditCategorySchema),
  passedRules: z.array(z.string()),
  violations: z.array(
    z.object({
      category: z.string(),
      rule: z.string(),
      severity: z.preprocess(normalizeSeverity, z.enum(['CRITICAL', 'MAJOR', 'MINOR'])),
      evidence: z.string(),
      recommendation: z.string(),
    })
  ),
  summary: z.string(),
});
