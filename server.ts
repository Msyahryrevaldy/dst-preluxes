import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import mammoth from 'mammoth';
import {
  generateContentWithRetry,
  getGeminiClient,
  isGeminiKeyConfigured,
  parseJsonSafely,
  resolveGeminiModel,
  sanitizeGeminiError,
  testGeminiConnection,
  Type,
} from './server/gemini.ts';
import {
  isValidFlowProjectId,
  SlidingWindowRateLimiter,
  verifyBearerTokenConstantTime,
} from './server/flowSecurity.ts';
import { extractAuthContext, requirePermission } from './server/rbac.ts';
import {
  BrandExtractionResultSchema,
  CreativeGenerationResultSchema,
  SocialPlanResultSchema,
  VisualAuditResultSchema,
} from './server/schemas.ts';
import { getServerStore, resetOrRestoreStore, saveServerStore } from './server/store.ts';
import { getOrCreateMasterPackageZip } from './server/masterPackage.ts';
import { registerPreluxesRoutes } from './server/preluxes.ts';
import { getAllowedPlatforms } from './src/data/preluxesSeed.ts';
import {
  calculateVisualAuditScore,
  canTransitionGuidelineState,
  getApprovedGuidelineVersion,
} from './src/utils/brandLogic.ts';
import type { BrandGuidelineVersion, SocialContent, VisualAudit } from './src/types/studio.ts';

const PORT = Number(process.env.PORT || 3000);
const app = express();

app.use(express.json({ limit: '25mb' }));

const flowWebhookRateLimiter = new SlidingWindowRateLimiter(60, 60_000);

const aiEngineTelemetry = {
  geminiStatus: (isGeminiKeyConfigured() ? 'UNKNOWN' : 'KEY_MISSING') as
    | 'CONNECTED'
    | 'ERROR'
    | 'UNKNOWN'
    | 'KEY_MISSING',
  lastSuccessfulTestAt: null as string | null,
  lastTestMessage: null as string | null,
  lastTestLatencyMs: null as number | null,
  lastRequestTimestamp: null as string | null,
  requestSuccessCount: 0,
  requestFailureCount: 0,
};

function recordAiOutcome(ok: boolean): void {
  aiEngineTelemetry.lastRequestTimestamp = new Date().toISOString();
  if (ok) {
    aiEngineTelemetry.requestSuccessCount += 1;
    aiEngineTelemetry.geminiStatus = 'CONNECTED';
  } else {
    aiEngineTelemetry.requestFailureCount += 1;
    if (!isGeminiKeyConfigured()) {
      aiEngineTelemetry.geminiStatus = 'KEY_MISSING';
    }
  }
}

function isWebhookSecretConfigured(): boolean {
  return Boolean(process.env.FLOW_WEBHOOK_SECRET && process.env.FLOW_WEBHOOK_SECRET.trim().length > 0);
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Studio DST V10+ — Brand Intelligence Studio',
    geminiConfigured: isGeminiKeyConfigured(),
    webhookSecretConfigured: isWebhookSecretConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// Preserved existing /generate GET readiness/quick-check contract
app.get('/generate', async (req, res) => {
  const store = getServerStore();
  const prompt = String(req.query.prompt || '').trim();
  if (!prompt) {
    res.json({
      status: 'ready',
      endpoint: '/generate',
      alias: '/api/flow-webhook',
      projectId: store.systemConfig.googleFlowProjectId,
      model: resolveGeminiModel(store.systemConfig.geminiModel),
      geminiConfigured: isGeminiKeyConfigured(),
      webhookSecretConfigured: isWebhookSecretConfigured(),
    });
    return;
  }
  try {
    const ai = getGeminiClient();
    const model = resolveGeminiModel(store.systemConfig.geminiModel);
    const response = await generateContentWithRetry(ai, {
      model,
      contents: prompt,
    });
    recordAiOutcome(true);
    res.json({ ok: true, model, text: response.text ?? '' });
  } catch (err: unknown) {
    recordAiOutcome(false);
    res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
  }
});

// Google Flow Webhook Receiver (POST /generate and POST /api/flow-webhook alias)
async function handleFlowWebhookGenerate(req: express.Request, res: express.Response): Promise<void> {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = flowWebhookRateLimiter.check(clientIp);
  if (!rate.allowed) {
    res.status(429).json({
      status: 'error',
      error: 'Too Many Requests: webhook rate limit exceeded.',
    });
    return;
  }

  // 1. Constant-time Bearer token verification (never rely on Project ID as auth)
  if (!verifyBearerTokenConstantTime(req.headers.authorization, process.env.FLOW_WEBHOOK_SECRET)) {
    res.status(401).json({
      status: 'error',
      error: 'Unauthorized: invalid or missing Bearer FLOW_WEBHOOK_SECRET.',
    });
    return;
  }

  // 2. Malformed payload validation
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({
      status: 'error',
      error: 'Bad Request: JSON object payload is required.',
    });
    return;
  }

  const { projectId, prompt } = req.body as {
    projectId?: unknown;
    prompt?: unknown;
  };

  if (typeof projectId !== 'string' || !projectId.trim() || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({
      status: 'error',
      error: 'Bad Request: projectId and non-empty prompt are required.',
    });
    return;
  }

  // 3. Validate Project ID strictly
  const store = getServerStore();
  const expectedProjectId =
    store.systemConfig.googleFlowProjectId || '0803359d-dab1-41ef-b3bf-398167349e36';
  if (!isValidFlowProjectId(projectId, expectedProjectId)) {
    res.status(403).json({
      status: 'error',
      error: 'Forbidden: invalid Google Flow projectId.',
    });
    return;
  }

  // 4. Execute Gemini via @google/genai with Admin-configured model
  try {
    const ai = getGeminiClient();
    const model = resolveGeminiModel(store.systemConfig.geminiModel);
    const response = await generateContentWithRetry(ai, {
      model,
      contents: prompt.trim(),
      config: {
        systemInstruction:
          'You are the Studio DST AI Engine, processing authorized production requests from Google Flow for DST Digital Creative Agency. Provide accurate, brand-safe creative and production outputs.',
      },
    });
    const output = (response.text ?? '').trim();
    const timestamp = new Date().toISOString();
    recordAiOutcome(true);

    res.json({
      status: 'success',
      ok: true,
      projectId: expectedProjectId,
      flow_project_id: expectedProjectId,
      result: output,
      aiOutput: output,
      model,
      timestamp,
    });
  } catch (err: unknown) {
    recordAiOutcome(false);
    aiEngineTelemetry.geminiStatus = 'ERROR';
    res.status(500).json({
      status: 'error',
      ok: false,
      error: sanitizeGeminiError(err),
    });
  }
}

app.post('/generate', handleFlowWebhookGenerate);
app.post('/api/flow-webhook', handleFlowWebhookGenerate);

// Brand Workspaces endpoints
app.get('/api/brand/workspaces', (req, res) => {
  const store = getServerStore();
  const auth = extractAuthContext(req);
  const workspaces =
    auth.role === 'ADMIN' || auth.assignedClientIds.length === 0
      ? store.workspaces
      : store.workspaces.filter((w) => auth.assignedClientIds.includes(w.clientId));
  res.json({ ok: true, workspaces });
});

app.get('/api/brand/workspaces/:id', (req, res) => {
  const store = getServerStore();
  const auth = extractAuthContext(req);
  const ws = store.workspaces.find((w) => w.id === req.params.id || w.clientId === req.params.id);
  if (!ws) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  if (auth.role !== 'ADMIN' && auth.assignedClientIds.length > 0 && !auth.assignedClientIds.includes(ws.clientId)) {
    res.status(403).json({ error: 'Forbidden: client workspace outside assigned scope' });
    return;
  }
  const guideline = store.guidelines[ws.id] ?? null;
  const assets = store.assets.filter((a) => a.clientId === ws.clientId);
  const creativeDirections = store.creativeDirections.filter((c) => c.clientId === ws.clientId);
  const socialContents = store.socialContents.filter((s) => s.clientId === ws.clientId);
  const visualAudits = store.visualAudits.filter((v) => v.clientId === ws.clientId);
  res.json({
    ok: true,
    workspace: ws,
    guideline,
    assets,
    creativeDirections,
    socialContents,
    visualAudits,
  });
});

app.post('/api/brand/workspaces', requirePermission('CREATE_CLIENT'), (req, res) => {
  const store = getServerStore();
  const auth = extractAuthContext(req);
  const body = req.body as {
    clientName?: string;
    clientCode?: string;
    industry?: string;
    brandName?: string;
    companyProfile?: string;
    targetAudience?: string;
    productsServices?: string;
    mission?: string;
    vision?: string;
    positioning?: string;
    uvp?: string;
  };
  if (!body.clientName || !body.brandName) {
    res.status(400).json({ error: 'clientName and brandName are required.' });
    return;
  }
  const slug = body.clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const clientId = `${slug}-${Date.now().toString(36)}`;
  const brandId = `ws-${clientId}`;
  const now = new Date().toISOString();

  const newClient = {
    id: clientId,
    name: body.clientName,
    code: (body.clientCode || body.clientName.slice(0, 3)).toUpperCase(),
    industry: body.industry || 'Creative & Digital',
    active: true,
    monthlyVideoTarget: 12,
    monthlyVideoCompleted: 0,
    defaultChannelId: store.channels[0]?.id || 'ch-dst-showcase',
  };
  const newWorkspace = {
    id: brandId,
    clientId,
    brandName: body.brandName,
    companyProfile: body.companyProfile || `${body.brandName} brand workspace`,
    industry: body.industry || 'Creative & Digital',
    targetAudience: body.targetAudience || 'NOT VERIFIED',
    productsServices: body.productsServices || 'NOT VERIFIED',
    mission: body.mission || 'NOT VERIFIED',
    vision: body.vision || 'NOT VERIFIED',
    positioning: body.positioning || 'NOT VERIFIED',
    uvp: body.uvp || 'NOT VERIFIED',
    brandLibraryFolderName: `Studio DST - Brand Library / ${body.clientName}`,
    primaryColorPreview: '#05349B',
    secondaryColorPreview: '#FDCB02',
    createdAt: now,
    updatedAt: now,
  };

  store.clients.push(newClient);
  store.workspaces.push(newWorkspace);
  store.activityLogs.unshift({
    id: `log-${crypto.randomUUID().slice(0, 8)}`,
    clientId,
    brandId,
    actor: auth.userName,
    role: auth.role,
    action: 'CREATED_WORKSPACE',
    target: `${body.brandName} (${body.clientName})`,
    timestamp: now,
  });
  saveServerStore(store);
  res.json({ ok: true, client: newClient, workspace: newWorkspace });
});

app.patch(
  '/api/brand/workspaces/:id',
  requirePermission('EDIT_WORKSPACE', (req) => req.body?.clientId),
  (req, res) => {
    const store = getServerStore();
    const idx = store.workspaces.findIndex((w) => w.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    store.workspaces[idx] = {
      ...store.workspaces[idx],
      ...req.body,
      id: store.workspaces[idx].id,
      clientId: store.workspaces[idx].clientId,
      updatedAt: new Date().toISOString(),
    };
    saveServerStore(store);
    res.json({ ok: true, workspace: store.workspaces[idx] });
  }
);

// Phase 4: Document Intelligence Extraction (A–N)
app.post(
  '/api/brand/extract',
  requirePermission('RUN_EXTRACTION', (req) => req.body?.clientId),
  async (req, res) => {
    try {
      const {
        clientId,
        brandId,
        brandName,
        fileName,
        mimeType,
        base64Data,
        textContent,
        existingNotes,
      } = req.body as {
        clientId: string;
        brandId: string;
        brandName: string;
        fileName: string;
        mimeType: string;
        base64Data?: string;
        textContent?: string;
        existingNotes?: string;
      };

      if (!clientId || !brandId || !fileName) {
        res.status(400).json({ error: 'clientId, brandId, and fileName are required.' });
        return;
      }

      const store = getServerStore();
      const ai = getGeminiClient();
      const model = resolveGeminiModel(store.systemConfig.geminiModel);

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Handle DOCX text extraction on server via mammoth
      let extractedDocText = textContent || '';
      if (
        base64Data &&
        (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          fileName.toLowerCase().endsWith('.docx'))
      ) {
        const buffer = Buffer.from(base64Data, 'base64');
        const result = await mammoth.extractRawText({ buffer });
        extractedDocText = result.value;
      } else if (base64Data && (mimeType === 'image/svg+xml' || mimeType.startsWith('text/'))) {
        extractedDocText = Buffer.from(base64Data, 'base64').toString('utf-8');
      } else if (base64Data && (mimeType === 'application/pdf' || mimeType.startsWith('image/'))) {
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const instruction = `You are a strict Brand Intelligence Document Analyst for DST Digital Creative Agency.
Analyze the uploaded brand document for "${brandName}" (File: "${fileName}") and extract facts across categories A–N:
A_IDENTITY (Company identity)
B_MISSION_VISION (Mission, vision, positioning)
C_PRODUCTS (Products and services)
D_AUDIENCE (Audience and customer profiles)
E_PERSONALITY (Brand personality)
F_VALUES (Brand values)
G_LOGO (Logo variations and usage)
H_COLORS (Primary, secondary and accent HEX colors)
I_TYPOGRAPHY (Typography and font hierarchy)
J_PHOTO_ILLUSTRATION (Photography and illustration style)
K_GRAPHIC_LAYOUT (Graphic elements and layout)
L_TONE (Tone of voice)
M_TAGLINE_MESSAGING (Tagline and key messaging)
N_DOS_DONTS (Brand DOs and DON'Ts)

CRITICAL ANTI-HALLUCINATION RULES:
1. NEVER invent official HEX codes, font family names, logo clear-space rules, or corporate statements that do not appear in the provided document.
2. If information for a category is NOT present in the document, set status to "NOT_VERIFIED", extractedValue to "NOT VERIFIED", and confidence to 0.
3. Mark verified facts directly stated in the document as status "VERIFIED" with exact sourceDocument ("${fileName}") and pageReference (e.g. "Hal. 1" or "Slide 3" or "Baris/Bagian").
4. If you offer a non-binding creative recommendation where a visual guideline isn't explicit, mark status "AI_SUGGESTION" and clearly label it as a suggestion.
5. If there is an internal contradiction or conflict with existing notes ("${existingNotes || 'none'}"), mark status "CONFLICT" and list conflictingSources.`;

      parts.push({
        text: `${instruction}\n\nDocument text content (if applicable):\n${extractedDocText.slice(0, 45000)}`,
      });

      const response = await generateContentWithRetry(ai, {
        model,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              evidences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    categoryCode: {
                      type: Type.STRING,
                      enum: [
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
                      ],
                    },
                    label: { type: Type.STRING },
                    extractedValue: { type: Type.STRING },
                    sourceDocument: { type: Type.STRING },
                    pageReference: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    status: {
                      type: Type.STRING,
                      enum: ['VERIFIED', 'AI_SUGGESTION', 'CONFLICT', 'NOT_VERIFIED'],
                    },
                    conflictingSources: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: [
                    'categoryCode',
                    'label',
                    'extractedValue',
                    'sourceDocument',
                    'pageReference',
                    'confidence',
                    'status',
                  ],
                },
              },
              suggestedSwatches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING },
                    role: {
                      type: Type.STRING,
                      enum: ['PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL'],
                    },
                    usageRule: { type: Type.STRING },
                    verified: { type: Type.BOOLEAN },
                  },
                  required: ['name', 'hex', 'role', 'usageRule', 'verified'],
                },
              },
              suggestedFonts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tier: {
                      type: Type.STRING,
                      enum: ['DISPLAY', 'HEADING', 'BODY', 'MONO'],
                    },
                    fontFamily: { type: Type.STRING },
                    weights: { type: Type.STRING },
                    usageNote: { type: Type.STRING },
                    verified: { type: Type.BOOLEAN },
                  },
                  required: ['tier', 'fontFamily', 'weights', 'usageNote', 'verified'],
                },
              },
            },
            required: ['summary', 'evidences', 'suggestedSwatches', 'suggestedFonts'],
          },
        },
      });

      const parsed = parseJsonSafely(response.text, 'Empty extraction response from Gemini.');
      const validated = BrandExtractionResultSchema.parse(parsed);

      const auth = extractAuthContext(req);
      store.activityLogs.unshift({
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        clientId,
        brandId,
        actor: auth.userName,
        role: auth.role,
        action: 'EXTRACTED_BRAND_DOCUMENT',
        target: `${fileName} (${validated.evidences.length} rules)`,
        timestamp: new Date().toISOString(),
      });
      saveServerStore(store);
      recordAiOutcome(true);

      res.json({ ok: true, model, extraction: validated });
    } catch (err: unknown) {
      recordAiOutcome(false);
      res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
    }
  }
);

// Phase 5: Brand Guidelines Approve / Transition
app.post(
  '/api/brand/guidelines/approve',
  requirePermission('APPROVE_GUIDELINE', (req) => req.body?.clientId),
  (req, res) => {
    const auth = extractAuthContext(req);
    const { brandId, clientId, versionId, nextStatus, rejectionReason, versionPayload } = req.body as {
      brandId: string;
      clientId: string;
      versionId: string;
      nextStatus: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED';
      rejectionReason?: string;
      versionPayload?: BrandGuidelineVersion;
    };

    if (!brandId || !clientId || !versionId || !nextStatus) {
      res.status(400).json({ error: 'brandId, clientId, versionId, and nextStatus are required.' });
      return;
    }

    const store = getServerStore();
    if (!store.guidelines[brandId]) {
      store.guidelines[brandId] = {
        brandId,
        clientId,
        activeVersionId: null,
        versions: versionPayload ? [versionPayload] : [],
      };
    }
    const guideline = store.guidelines[brandId];
    let targetIdx = guideline.versions.findIndex((v) => v.id === versionId);
    if (targetIdx === -1 && versionPayload) {
      guideline.versions.push(versionPayload);
      targetIdx = guideline.versions.length - 1;
    }
    if (targetIdx === -1) {
      res.status(404).json({ error: 'Guideline version not found.' });
      return;
    }

    const target = guideline.versions[targetIdx];
    if (!canTransitionGuidelineState(target.status, nextStatus, auth.role)) {
      res.status(400).json({
        error: `Invalid guideline state transition from ${target.status} to ${nextStatus} for role ${auth.role}.`,
      });
      return;
    }

    const now = new Date().toISOString();
    // Archive previously approved versions when approving a new version
    if (nextStatus === 'APPROVED') {
      guideline.versions = guideline.versions.map((v) =>
        v.id !== versionId && v.status === 'APPROVED' ? { ...v, status: 'ARCHIVED' } : v
      );
      guideline.activeVersionId = versionId;
    }

    guideline.versions[targetIdx] = {
      ...target,
      ...(versionPayload ?? {}),
      status: nextStatus,
      approvedBy: nextStatus === 'APPROVED' ? auth.userName : target.approvedBy,
      approvedAt: nextStatus === 'APPROVED' ? now : target.approvedAt,
      rejectionReason: nextStatus === 'DRAFT' && rejectionReason ? rejectionReason : undefined,
    };

    store.activityLogs.unshift({
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      clientId,
      brandId,
      actor: auth.userName,
      role: auth.role,
      action: `GUIDELINE_${nextStatus}`,
      target: `Guideline v${guideline.versions[targetIdx].versionNumber}`,
      timestamp: now,
    });
    saveServerStore(store);

    res.json({ ok: true, guideline });
  }
);

// Phase 6: Creative Direction Engine (3 Concepts)
app.post(
  '/api/brand/creative/generate',
  requirePermission('GENERATE_CREATIVE', (req) => req.body?.clientId),
  async (req, res) => {
    try {
      const {
        clientId,
        brandId,
        workspace,
        approvedGuideline,
        campaignObjective,
        targetAudience,
        product,
        platform,
        mainMessage,
        duration,
        emotion,
        format,
        language = 'id',
      } = req.body as {
        clientId: string;
        brandId: string;
        workspace: { brandName: string; positioning: string; uvp: string };
        approvedGuideline: BrandGuidelineVersion | null;
        campaignObjective: string;
        targetAudience: string;
        product: string;
        platform: string;
        mainMessage: string;
        duration: string;
        emotion: string;
        format: string;
        language?: 'id' | 'en';
      };

      const store = getServerStore();
      const ai = getGeminiClient();
      const model = resolveGeminiModel(store.systemConfig.geminiModel);

      const guidelineSummary = approvedGuideline
        ? `APPROVED GUIDELINE v${approvedGuideline.versionNumber}:
Colors: ${approvedGuideline.swatches.map((s) => `${s.name} ${s.hex}`).join(', ')}
Fonts: ${approvedGuideline.fonts.map((f) => `${f.tier}:${f.fontFamily}`).join(', ')}
Tone: ${approvedGuideline.sections.toneOfVoice}
Photography: ${approvedGuideline.sections.photography}
Composition: ${approvedGuideline.sections.composition}
DOs: ${approvedGuideline.sections.dosList.join('; ')}
DON'Ts: ${approvedGuideline.sections.dontsList.join('; ')}`
        : 'NO APPROVED GUIDELINE YET — Use brand profile cleanly without inventing official HEX codes or unverified logo rules.';

      const prompt = `Act as Senior Creative Director at DST Digital Creative Agency.
Language for copy/briefs: ${language === 'en' ? 'English' : 'Bahasa Indonesia (natural modern agency prose)'}.
Brand: ${workspace.brandName}
Positioning: ${workspace.positioning}
UVP: ${workspace.uvp}
${guidelineSummary}

CAMPAIGN INPUTS:
- Objective: ${campaignObjective}
- Target Audience: ${targetAudience}
- Product/Service: ${product}
- Platform: ${platform}
- Main Message: ${mainMessage}
- Duration: ${duration}
- Desired Emotion: ${emotion}
- Format: ${format}

Generate exactly 3 DISTINCT creative concepts.
CRITICAL: Respect the approved guideline strictly. Separate AI image prompts (pure visual scene description without text overlays or red border guides) from headlines/CTA.`;

      const response = await generateContentWithRetry(ai, {
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concepts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    conceptTitle: { type: Type.STRING },
                    campaignName: { type: Type.STRING },
                    creativeConcept: { type: Type.STRING },
                    bigIdea: { type: Type.STRING },
                    strategicRationale: { type: Type.STRING },
                    artDirection: { type: Type.STRING },
                    visualDirection: { type: Type.STRING },
                    moodboardBrief: { type: Type.STRING },
                    colorDirection: { type: Type.STRING },
                    typographyDirection: { type: Type.STRING },
                    photographyDirection: { type: Type.STRING },
                    composition: { type: Type.STRING },
                    headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cta: { type: Type.STRING },
                    aiImagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                    designerProductionBrief: { type: Type.STRING },
                  },
                  required: [
                    'conceptTitle',
                    'campaignName',
                    'creativeConcept',
                    'bigIdea',
                    'strategicRationale',
                    'artDirection',
                    'visualDirection',
                    'moodboardBrief',
                    'colorDirection',
                    'typographyDirection',
                    'photographyDirection',
                    'composition',
                    'headlines',
                    'cta',
                    'aiImagePrompts',
                    'designerProductionBrief',
                  ],
                },
              },
            },
            required: ['concepts'],
          },
        },
      });

      const parsed = parseJsonSafely(response.text, 'Empty creative direction output');
      const validated = CreativeGenerationResultSchema.parse(parsed);

      const auth = extractAuthContext(req);
      store.activityLogs.unshift({
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        clientId,
        brandId,
        actor: auth.userName,
        role: auth.role,
        action: 'GENERATED_CREATIVE_DIRECTION',
        target: `${validated.concepts.length} konsep untuk ${workspace.brandName}`,
        timestamp: new Date().toISOString(),
      });
      saveServerStore(store);
      recordAiOutcome(true);

      res.json({ ok: true, model, concepts: validated.concepts });
    } catch (err: unknown) {
      recordAiOutcome(false);
      res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
    }
  }
);

// Phase 7: Social Media Studio Content Plan Generator
app.post(
  '/api/brand/content/generate',
  requirePermission('GENERATE_SOCIAL', (req) => req.body?.clientId),
  async (req, res) => {
    try {
      const {
        clientId,
        brandId,
        brandName,
        campaignName,
        horizonDays = 7,
        platforms: platformsInput = ['Instagram', 'TikTok'],
        topicFocus,
        approvedGuideline,
        language = 'id',
      } = req.body as {
        clientId: string;
        brandId: string;
        brandName: string;
        campaignName: string;
        horizonDays: 7 | 14 | 30;
        platforms: Array<'Instagram' | 'TikTok' | 'Facebook' | 'LinkedIn'>;
        topicFocus: string;
        approvedGuideline: BrandGuidelineVersion | null;
        language?: 'id' | 'en';
      };

      const store = getServerStore();
      const ai = getGeminiClient();
      const model = resolveGeminiModel(store.systemConfig.geminiModel);

      // Preluxes hanya dijadwalkan ke Instagram, Facebook, dan TikTok.
      const allowedPlatforms = getAllowedPlatforms(clientId);
      const filteredPlatforms = platformsInput.filter((p) => allowedPlatforms.includes(p));
      const platforms =
        filteredPlatforms.length > 0
          ? filteredPlatforms
          : allowedPlatforms.filter((p) => p === 'Instagram' || p === 'TikTok' || p === 'Facebook').slice(0, 2);

      const itemCount = horizonDays === 30 ? 8 : horizonDays === 14 ? 6 : 4;
      const guidelineContext = approvedGuideline
        ? `Approved Guideline v${approvedGuideline.versionNumber}: Tone=${approvedGuideline.sections.toneOfVoice}; Messaging=${approvedGuideline.sections.messaging}; Colors=${approvedGuideline.swatches.map((s) => `${s.name}(${s.hex})`).join(', ')}`
        : 'Use clean professional agency tone without inventing unverified color rules.';

      const prompt = `Create a ${horizonDays}-day social media production plan (${itemCount} concrete deliverables spread across dayOffset 1..${horizonDays}) for "${brandName}".
Campaign: ${campaignName}
Platforms to cover: ${platforms.join(', ')}
Topic Focus: ${topicFocus}
${guidelineContext}
Language: ${language === 'en' ? 'English' : 'Indonesian'}.
For Carousel items, fill carouselSlides (4-5 slides). For Reels / Short Video items, fill videoScript and sceneBreakdown. Ensure visualPrompt describes pure imagery with zero baked-in text overlays or red border guides.`;

      const response = await generateContentWithRetry(ai, {
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategySummary: { type: Type.STRING },
              contentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    platform: {
                      type: Type.STRING,
                      enum: platforms as string[],
                    },
                    format: {
                      type: Type.STRING,
                      enum: ['Carousel', 'Reels / Short Video', 'Single Image', 'Thread / Article'],
                    },
                    contentPillar: { type: Type.STRING },
                    dayOffset: { type: Type.INTEGER },
                    hook: { type: Type.STRING },
                    headline: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cta: { type: Type.STRING },
                    carouselSlides: { type: Type.ARRAY, items: { type: Type.STRING } },
                    videoScript: { type: Type.STRING },
                    sceneBreakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
                    visualPrompt: { type: Type.STRING },
                  },
                  required: [
                    'platform',
                    'format',
                    'contentPillar',
                    'dayOffset',
                    'hook',
                    'headline',
                    'caption',
                    'hashtags',
                    'cta',
                    'carouselSlides',
                    'videoScript',
                    'sceneBreakdown',
                    'visualPrompt',
                  ],
                },
              },
            },
            required: ['strategySummary', 'contentPillars', 'items'],
          },
        },
      });

      const parsed = parseJsonSafely(response.text, 'Empty social plan output');
      const validated = SocialPlanResultSchema.parse(parsed);

      const baseDate = new Date();
      const campaignId = `cmp-${crypto.randomUUID().slice(0, 8)}`;
      const mappedItems: SocialContent[] = validated.items.map((item) => {
        const dt = new Date(baseDate);
        dt.setDate(dt.getDate() + item.dayOffset);
        return {
          id: `soc-${crypto.randomUUID().slice(0, 8)}`,
          clientId,
          brandId,
          guidelineVersionId: approvedGuideline?.id ?? null,
          campaignId,
          campaignName,
          contentPillar: item.contentPillar,
          platform: item.platform,
          format: item.format,
          scheduledDate: dt.toISOString().slice(0, 10),
          status: 'DRAFT',
          hook: item.hook,
          headline: item.headline,
          caption: item.caption,
          hashtags: item.hashtags,
          cta: item.cta,
          carouselSlides: item.carouselSlides,
          videoScript: item.videoScript,
          sceneBreakdown: item.sceneBreakdown,
          visualPrompt: item.visualPrompt,
        };
      });

      const auth = extractAuthContext(req);
      store.activityLogs.unshift({
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        clientId,
        brandId,
        actor: auth.userName,
        role: auth.role,
        action: 'GENERATED_SOCIAL_PLAN',
        target: `${campaignName} (${mappedItems.length} item, ${horizonDays} hari)`,
        timestamp: new Date().toISOString(),
      });
      saveServerStore(store);
      recordAiOutcome(true);

      res.json({
        ok: true,
        model,
        campaignId,
        strategySummary: validated.strategySummary,
        contentPillars: validated.contentPillars,
        items: mappedItems,
      });
    } catch (err: unknown) {
      recordAiOutcome(false);
      res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
    }
  }
);

// Phase 9: Visual Consistency Checker (Multimodal Vision)
app.post(
  '/api/brand/visual/check',
  requirePermission('RUN_VISUAL_AUDIT', (req) => req.body?.clientId),
  async (req, res) => {
    try {
      const {
        clientId,
        brandId,
        brandName,
        assetName,
        mimeType,
        imageBase64,
        approvedGuideline,
        language = 'id',
      } = req.body as {
        clientId: string;
        brandId: string;
        brandName: string;
        assetName: string;
        mimeType: string;
        imageBase64: string;
        approvedGuideline: BrandGuidelineVersion | null;
        language?: 'id' | 'en';
      };

      if (!imageBase64 || !approvedGuideline) {
        res.status(400).json({
          error: 'An image and an APPROVED guideline version are required to run a visual consistency check.',
        });
        return;
      }

      const store = getServerStore();
      const ai = getGeminiClient();
      const model = resolveGeminiModel(store.systemConfig.geminiModel);

      const rubricPrompt = `Evaluate this submitted marketing/brand asset image for "${brandName}" (Asset: "${assetName}") strictly against Approved Brand Guideline v${approvedGuideline.versionNumber}.
Language: ${language === 'en' ? 'English' : 'Indonesian'}.

APPROVED GUIDELINE RULES:
- Swatches: ${approvedGuideline.swatches.map((s) => `${s.name} (${s.hex}) [${s.role}]`).join(', ')}
- Typography: ${approvedGuideline.fonts.map((f) => `${f.tier}: ${f.fontFamily}`).join(', ')} — ${approvedGuideline.sections.typography}
- Logo System: ${approvedGuideline.sections.logoSystem}
- Photography/Imagery: ${approvedGuideline.sections.photography} | ${approvedGuideline.sections.illustration}
- Messaging & Tone: ${approvedGuideline.sections.messaging} | ${approvedGuideline.sections.toneOfVoice}
- Composition: ${approvedGuideline.sections.composition}
- DOs: ${approvedGuideline.sections.dosList.join('; ')}
- DON'Ts: ${approvedGuideline.sections.dontsList.join('; ')}

EVALUATE THESE EXACT 6 CATEGORIES:
1. key: "logo", label: "Logo usage", maxPoints: 20
2. key: "color", label: "Color consistency", maxPoints: 25
3. key: "typography", label: "Typography", maxPoints: 15
4. key: "imagery", label: "Imagery & illustration", maxPoints: 15
5. key: "messaging", label: "Messaging & tone", maxPoints: 15
6. key: "layout", label: "Layout & composition", maxPoints: 10

CRITICAL INTEGRITY RULES:
- If a property cannot be assessed from the image (for instance, no logo is present in a pure photography shot, or no headline copy exists to assess messaging), set assessable: false, earnedPoints: null, and state the reason clearly (NOT ASSESSABLE).
- Do NOT pretend to identify exact font file names from raster pixels—assess typographic hierarchy, weight contrast, legibility, and visual style alignment instead.
- Cite concrete visual evidence directly observed in the image.`;

      const response = await generateContentWithRetry(ai, {
        model,
        contents: {
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
            { text: rubricPrompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: {
                      type: Type.STRING,
                      enum: ['logo', 'color', 'typography', 'imagery', 'messaging', 'layout'],
                    },
                    label: { type: Type.STRING },
                    maxPoints: { type: Type.NUMBER },
                    earnedPoints: { type: Type.NUMBER, nullable: true },
                    assessable: { type: Type.BOOLEAN },
                    reason: { type: Type.STRING },
                  },
                  required: ['key', 'label', 'maxPoints', 'earnedPoints', 'assessable'],
                },
              },
              passedRules: { type: Type.ARRAY, items: { type: Type.STRING } },
              violations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    rule: { type: Type.STRING },
                    severity: {
                      type: Type.STRING,
                      enum: ['CRITICAL', 'MAJOR', 'MINOR'],
                    },
                    evidence: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                  required: ['category', 'rule', 'severity', 'evidence', 'recommendation'],
                },
              },
              summary: { type: Type.STRING },
            },
            required: ['categories', 'passedRules', 'violations', 'summary'],
          },
        },
      });

      const parsed = parseJsonSafely(response.text, 'Empty visual audit output');
      const validated = VisualAuditResultSchema.parse(parsed);
      const computed = calculateVisualAuditScore(validated.categories);
      const auth = extractAuthContext(req);
      const now = new Date().toISOString();

      const audit: VisualAudit = {
        id: `aud-${crypto.randomUUID().slice(0, 8)}`,
        brandId,
        clientId,
        guidelineVersionId: approvedGuideline.id,
        assetName,
        imageDataUrl: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
        categories: validated.categories,
        overallScore: computed.overallScore,
        passedRules: validated.passedRules,
        violations: validated.violations.map((v, idx) => ({ ...v, id: `viol-${idx + 1}` })),
        verdict: computed.verdict,
        summary: validated.summary,
        auditedBy: auth.userName,
        auditedAt: now,
      };

      store.visualAudits.unshift(audit);
      store.activityLogs.unshift({
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        clientId,
        brandId,
        actor: auth.userName,
        role: auth.role,
        action: 'VISUAL_AUDIT_COMPLETED',
        target: `${assetName} (${audit.overallScore}/100 ${audit.verdict})`,
        timestamp: now,
      });
      saveServerStore(store);
      recordAiOutcome(true);

      res.json({ ok: true, model, audit, scoreDetails: computed });
    } catch (err: unknown) {
      recordAiOutcome(false);
      res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
    }
  }
);

// Google Flow & AI Engine Integration (Preserved Project 0803359d-dab1-41ef-b3bf-398167349e36)
app.get('/api/flow/config', (_req, res) => {
  const store = getServerStore();
  res.json({
    ok: true,
    googleFlowProjectId: store.systemConfig.googleFlowProjectId,
    googleFlowEndpointUrl: store.systemConfig.googleFlowEndpointUrl,
    readyToPostFolderId: store.systemConfig.readyToPostFolderId,
    geminiModel: resolveGeminiModel(store.systemConfig.geminiModel),
    geminiKeyConfigured: isGeminiKeyConfigured(),
    webhookSecretConfigured: isWebhookSecretConfigured(),
    telemetry: { ...aiEngineTelemetry },
  });
});

app.post('/api/flow/config', requirePermission('MANAGE_ADMIN'), (req, res) => {
  const store = getServerStore();
  const { googleFlowProjectId, googleFlowEndpointUrl, geminiModel } = req.body as {
    googleFlowProjectId?: string;
    googleFlowEndpointUrl?: string;
    geminiModel?: 'gemini-4-hydrogen' | 'gemini-4-argon' | 'gemini-4-carbon' | 'gemini-3.1-flash-lite';
  };
  if (googleFlowProjectId) store.systemConfig.googleFlowProjectId = googleFlowProjectId.trim();
  if (typeof googleFlowEndpointUrl === 'string') store.systemConfig.googleFlowEndpointUrl = googleFlowEndpointUrl.trim();
  if (geminiModel) store.systemConfig.geminiModel = geminiModel;
  saveServerStore(store);
  res.json({
    ok: true,
    systemConfig: store.systemConfig,
    geminiKeyConfigured: isGeminiKeyConfigured(),
    webhookSecretConfigured: isWebhookSecretConfigured(),
    telemetry: { ...aiEngineTelemetry },
  });
});

app.post('/api/flow/test-ping', async (req, res) => {
  const store = getServerStore();
  const {
    target = 'both',
    endpointUrl,
    model: requestedModel,
  } = (req.body ?? {}) as {
    target?: 'gemini' | 'flow' | 'both';
    endpointUrl?: string;
    model?: string;
  };

  const activeModel = resolveGeminiModel(requestedModel || store.systemConfig.geminiModel);
  const endpoint = (endpointUrl ?? store.systemConfig.googleFlowEndpointUrl ?? '').trim();
  const projectId = store.systemConfig.googleFlowProjectId;

  let geminiResult: Awaited<ReturnType<typeof testGeminiConnection>> | null = null;
  if (target === 'gemini' || target === 'both') {
    geminiResult = await testGeminiConnection(activeModel);
    aiEngineTelemetry.lastTestLatencyMs = geminiResult.responseTimeMs;
    aiEngineTelemetry.lastTestMessage = geminiResult.message;
    if (geminiResult.ok) {
      aiEngineTelemetry.geminiStatus = 'CONNECTED';
      aiEngineTelemetry.lastSuccessfulTestAt = geminiResult.checkedAt;
      recordAiOutcome(true);
    } else {
      aiEngineTelemetry.geminiStatus = geminiResult.keyConfigured ? 'ERROR' : 'KEY_MISSING';
      recordAiOutcome(false);
    }
  }

  let flowResult: {
    ok: boolean;
    projectId: string;
    configured: boolean;
    status: string;
    httpStatus?: number;
    responseTimeMs?: number;
    message: string;
  } | null = null;

  if (target === 'flow' || target === 'both') {
    if (!endpoint) {
      flowResult = {
        ok: false,
        projectId,
        configured: false,
        status: 'PROVIDER_ENDPOINT_NOT_CONFIGURED',
        message: `Google Flow Project ID terdaftar (${projectId}), namun URL endpoint eksternal belum dikonfigurasi.`,
      };
    } else {
      const flowStart = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        // Probe with GET (safe read-only check; /generate responds 200 ready)
        const resp = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timer);
        const latency = Date.now() - flowStart;
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        const isHtmlFallback = contentType.includes('text/html');
        if (isHtmlFallback) {
          flowResult = {
            ok: false,
            projectId,
            configured: true,
            status: 'SPA_HTML_FALLBACK',
            httpStatus: resp.status,
            responseTimeMs: latency,
            message: `Endpoint Cloud Run merespons HTML SPA (HTTP ${resp.status}, ${latency}ms), bukan JSON webhook /generate Studio DST. Deploy revisi backend terbaru ke Cloud Run.`,
          };
        } else {
          const ok = resp.ok || resp.status === 401 || resp.status === 405;
          flowResult = {
            ok,
            projectId,
            configured: true,
            status: resp.ok ? 'REACHABLE' : `HTTP_${resp.status}`,
            httpStatus: resp.status,
            responseTimeMs: latency,
            message: resp.ok
              ? `Flow endpoint aktif & merespons JSON HTTP ${resp.status} (${latency}ms).`
              : `Flow endpoint aktif & merespons HTTP ${resp.status} (${latency}ms).`,
          };
        }
      } catch (err: unknown) {
        flowResult = {
          ok: false,
          projectId,
          configured: true,
          status: 'UNREACHABLE',
          responseTimeMs: Date.now() - flowStart,
          message: err instanceof Error ? err.message : 'Unable to reach Flow endpoint.',
        };
      }
    }
  }

  const overallOk =
    target === 'gemini'
      ? Boolean(geminiResult?.ok)
      : target === 'flow'
      ? Boolean(flowResult?.ok)
      : Boolean(geminiResult?.ok && flowResult?.ok);

  res.json({
    ok: overallOk,
    projectId,
    model: activeModel,
    geminiKeyConfigured: isGeminiKeyConfigured(),
    webhookSecretConfigured: isWebhookSecretConfigured(),
    gemini: geminiResult,
    flow: flowResult,
    telemetry: { ...aiEngineTelemetry },
    message:
      target === 'gemini'
        ? geminiResult?.message
        : target === 'flow'
        ? flowResult?.message
        : [geminiResult?.message, flowResult?.message].filter(Boolean).join(' | '),
  });
});

app.post('/api/flow/dispatch', requirePermission('EDIT_STUDIO_LOCK'), async (req, res) => {
  const store = getServerStore();
  const { sceneTitle, compiledPrompt, textOverlaySpec, negativeDirectives, projectId } = req.body as {
    sceneTitle: string;
    compiledPrompt: string;
    textOverlaySpec: string;
    negativeDirectives: string;
    projectId?: string;
  };
  const activeProjectId = projectId || store.systemConfig.googleFlowProjectId;
  const endpoint = store.systemConfig.googleFlowEndpointUrl;

  if (!endpoint || !endpoint.trim()) {
    res.status(422).json({
      ok: false,
      status: 'PROVIDER_UNCONFIGURED',
      projectId: activeProjectId,
      message:
        'Prompt berhasil dikompilasi dengan Brand Lock, namun pengiriman ke Google Flow belum dijalankan karena endpoint provider Flow belum disetel di Admin.',
    });
    return;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const webhookSecret = process.env.FLOW_WEBHOOK_SECRET?.trim();
    if (webhookSecret) {
      headers.Authorization = `Bearer ${webhookSecret}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        projectId: activeProjectId,
        sceneTitle,
        prompt: compiledPrompt,
        textOverlaySpec,
        negativeDirectives,
      }),
    });
    clearTimeout(timer);

    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      recordAiOutcome(false);
      res.status(502).json({
        ok: false,
        status: 'FAILED',
        projectId: activeProjectId,
        httpStatus: resp.status,
        message:
          (payload as { error?: string; message?: string })?.error ||
          (payload as { message?: string })?.message ||
          `Provider Google Flow menolak permintaan (HTTP ${resp.status}).`,
      });
      return;
    }
    recordAiOutcome(true);
    res.json({
      ok: true,
      status: 'SUBMITTED',
      projectId: activeProjectId,
      providerResponse: payload,
      message: `Scene berhasil dikirim ke Google Flow Endpoint (${(payload as { model?: string })?.model || store.systemConfig.geminiModel}).`,
    });
  } catch (err: unknown) {
    recordAiOutcome(false);
    res.status(502).json({
      ok: false,
      status: 'FAILED',
      projectId: activeProjectId,
      message: err instanceof Error ? err.message : 'Flow network dispatch failed',
    });
  }
});

// Preserved Agent Routes + Activated Brief/Studio AI Generators
app.post('/api/agent/autopost-organize', async (req, res) => {
  try {
    const { folderId, files = [] } = req.body as {
      folderId?: string;
      files: Array<{ id?: string; name: string; mimeType?: string }>;
    };
    const store = getServerStore();
    const ai = getGeminiClient();
    const model = resolveGeminiModel(store.systemConfig.geminiModel);

    const prompt = `Organize these Ready To Post Drive assets (Folder ID: ${folderId || store.systemConfig.readyToPostFolderId}) into Studio DST client publishing queues without modifying the root folder structure.
Files: ${JSON.stringify(files.slice(0, 50))}
Known Clients: ${store.clients.map((c) => `${c.code}: ${c.name}`).join(' | ')}`;

    const response = await generateContentWithRetry(ai, {
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fileName: { type: Type.STRING },
                  matchedClient: { type: Type.STRING },
                  targetSubfolder: { type: Type.STRING },
                  readyStatus: { type: Type.STRING },
                },
                required: ['fileName', 'matchedClient', 'targetSubfolder', 'readyStatus'],
              },
            },
          },
          required: ['summary', 'recommendations'],
        },
      },
    });
    const plan = parseJsonSafely(response.text, 'Failed to build autopost organization plan');
    recordAiOutcome(true);
    res.json({ ok: true, model, plan });
  } catch (err: unknown) {
    recordAiOutcome(false);
    res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
  }
});

app.post('/api/agent/refine-caption', async (req, res) => {
  try {
    const { caption, platform, toneOfVoice, brandName } = req.body as {
      caption: string;
      platform: string;
      toneOfVoice?: string;
      brandName?: string;
    };
    const store = getServerStore();
    const ai = getGeminiClient();
    const model = resolveGeminiModel(store.systemConfig.geminiModel);

    const response = await generateContentWithRetry(ai, {
      model,
      contents: `Refine this social caption/voiceover for ${brandName || 'Studio DST'} on ${platform} in Indonesian. Tone: ${toneOfVoice || 'Clear, crisp, editorial'}.\nOriginal:\n${caption}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedCaption: { type: Type.STRING },
            hookAlternatives: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['refinedCaption', 'hookAlternatives'],
        },
      },
    });
    const refined = parseJsonSafely<Record<string, unknown>>(response.text, 'Empty refine-caption output');
    recordAiOutcome(true);
    res.json({ ok: true, model, ...refined });
  } catch (err: unknown) {
    recordAiOutcome(false);
    res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
  }
});

app.post('/api/agent/classify-drive-assets', async (req, res) => {
  try {
    const { files = [] } = req.body as { files: Array<{ name: string; mimeType?: string }> };
    const store = getServerStore();
    const ai = getGeminiClient();
    const model = resolveGeminiModel(store.systemConfig.geminiModel);

    const response = await generateContentWithRetry(ai, {
      model,
      contents: `Classify these Google Drive files into Studio DST categories (LOGO, BRAND_GUIDELINE, VIDEO_READY, KEY_VISUAL, PHOTO, OTHER): ${JSON.stringify(files.slice(0, 50))}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classified: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: ['name', 'category', 'confidence'],
              },
            },
          },
          required: ['classified'],
        },
      },
    });
    const result = parseJsonSafely<Record<string, unknown>>(response.text, 'Empty classification output');
    recordAiOutcome(true);
    res.json({ ok: true, model, ...result });
  } catch (err: unknown) {
    recordAiOutcome(false);
    res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
  }
});

app.post('/api/agent/brief-generate', async (req, res) => {
  try {
    const { brandName, channelName, platform, visualStyle, topicIdea, approvedGuideline } = req.body as {
      brandName: string;
      channelName: string;
      platform: string;
      visualStyle: string;
      topicIdea?: string;
      approvedGuideline?: BrandGuidelineVersion | null;
    };
    const store = getServerStore();
    const ai = getGeminiClient();
    const model = resolveGeminiModel(store.systemConfig.geminiModel);

    const guideNote = approvedGuideline
      ? `Approved Brand Guideline v${approvedGuideline.versionNumber}: Tone=${approvedGuideline.sections.toneOfVoice}; Messaging=${approvedGuideline.sections.messaging}`
      : 'No approved guideline locked yet; keep brief clean and factual.';

    const response = await generateContentWithRetry(ai, {
      model,
      contents: `Generate a structured production brief in Bahasa Indonesia for "${brandName}" on channel "${channelName}" (${platform}).
Visual Style: ${visualStyle}
Topic/Angle: ${topicIdea || 'Kampanye edukasi & storytelling flagship bulan ini'}
${guideNote}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            objective: { type: Type.STRING },
            keyMessage: { type: Type.STRING },
          },
          required: ['title', 'objective', 'keyMessage'],
        },
      },
    });
    const brief = parseJsonSafely<Record<string, unknown>>(response.text, 'Empty brief generator output');
    recordAiOutcome(true);
    res.json({ ok: true, model, brief });
  } catch (err: unknown) {
    recordAiOutcome(false);
    res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
  }
});

app.post('/api/agent/studio-scene-generate', async (req, res) => {
  try {
    const {
      brandName,
      sceneNumber,
      sceneTitle,
      channelStyle,
      characterRef,
      approvedGuideline,
    } = req.body as {
      brandName: string;
      sceneNumber: number;
      sceneTitle: string;
      channelStyle?: string;
      characterRef?: string;
      approvedGuideline?: BrandGuidelineVersion | null;
    };
    const store = getServerStore();
    const ai = getGeminiClient();
    const model = resolveGeminiModel(store.systemConfig.geminiModel);

    const guideContext = approvedGuideline
      ? `Colors: ${approvedGuideline.swatches.map((s) => `${s.name} ${s.hex}`).join(', ')}; Photography: ${approvedGuideline.sections.photography}; Composition: ${approvedGuideline.sections.composition}`
      : 'Use crisp studio composition without inventing unverified HEX codes.';

    const response = await generateContentWithRetry(ai, {
      model,
      contents: `Generate Scene ${sceneNumber} ("${sceneTitle}") production specs in Indonesian for "${brandName}".
Channel Visual Style: ${channelStyle || 'Editorial Studio'}
Character Lock: ${characterRef || 'Consistent brand presenter'}
${guideContext}
IMPORTANT: visualDescription must describe ONLY visual imagery/camera/lighting with ZERO text overlays or red border guides. Put overlay copy into textOverlay.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualDescription: { type: Type.STRING },
            textOverlay: { type: Type.STRING },
            voiceover: { type: Type.STRING },
          },
          required: ['visualDescription', 'textOverlay', 'voiceover'],
        },
      },
    });
    const scene = parseJsonSafely<Record<string, unknown>>(response.text, 'Empty scene generator output');
    recordAiOutcome(true);
    res.json({ ok: true, model, scene });
  } catch (err: unknown) {
    recordAiOutcome(false);
    res.status(500).json({ ok: false, error: sanitizeGeminiError(err) });
  }
});

// Backup & Restore endpoints
app.get('/api/backup', requirePermission('MANAGE_ADMIN'), (_req, res) => {
  res.json({ ok: true, exportedAt: new Date().toISOString(), state: getServerStore() });
});

app.post('/api/restore', requirePermission('MANAGE_ADMIN'), (req, res) => {
  const payload = req.body?.state;
  if (!payload || !Array.isArray(payload.clients) || !Array.isArray(payload.workspaces)) {
    res.status(400).json({ error: 'Invalid Studio DST backup payload.' });
    return;
  }
  const restored = resetOrRestoreStore(payload);
  res.json({ ok: true, state: restored });
});

// Preluxes (website hub): katalog live/bundled + konfigurasi URL website
registerPreluxesRoutes(app);

// Master Package Archive Endpoints (/download/studio-dst-v10-master-package.zip)
app.get('/api/master-package/info', (req, res) => {
  try {
    const refresh = req.query.refresh === '1';
    const pkg = getOrCreateMasterPackageZip(process.cwd(), refresh);
    res.json({
      ok: true,
      filename: pkg.filename,
      downloadPath: `/download/${pkg.filename}`,
      downloadUrl: '/api/master-package/download',
      sizeBytes: pkg.sizeBytes,
      fileCount: pkg.fileCount,
    });
  } catch (err: unknown) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to inspect master package.',
    });
  }
});

app.get('/api/master-package/download', (req, res) => {
  try {
    const refresh = req.query.refresh === '1';
    const pkg = getOrCreateMasterPackageZip(process.cwd(), refresh);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${pkg.filename}"`);
    res.setHeader('Content-Length', String(pkg.sizeBytes));
    res.send(pkg.buffer);
  } catch (err: unknown) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to build master package archive.',
    });
  }
});

// Serve Vite in dev or dist in production
async function startServer() {
  try {
    getOrCreateMasterPackageZip(process.cwd(), true);
  } catch (err) {
    console.warn('Could not pre-build master package zip:', err);
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Studio DST V11 (+Preluxes) server listening on http://localhost:${PORT}`);
  });
}

startServer();
