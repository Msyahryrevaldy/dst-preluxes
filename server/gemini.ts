import { GoogleGenAI, Type, type GenerateContentParameters, type GenerateContentResponse } from '@google/genai';

const VALID_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-3.1-flash-lite',
]);

export function resolveGeminiModel(requested?: string): string {
  const candidate = requested?.trim() || process.env.GEMINI_MODEL?.trim();
  if (candidate && VALID_MODELS.has(candidate)) {
    return candidate;
  }
  if (candidate && /^[a-z0-9._-]+$/i.test(candidate)) {
    return candidate;
  }
  return 'gemini-4-hydrogen';
}

export function isGeminiKeyConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function sanitizeGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Gemini request failed');
  const key = process.env.GEMINI_API_KEY?.trim();
  let safe = key ? raw.split(key).join('[REDACTED]') : raw;
  const flowSecret = process.env.FLOW_WEBHOOK_SECRET?.trim();
  if (flowSecret) {
    safe = safe.split(flowSecret).join('[REDACTED]');
  }
  if (safe.includes('API_KEY_INVALID') || safe.includes('PERMISSION_DENIED')) {
    return 'API key Gemini tidak valid atau ditolak (periksa GEMINI_API_KEY di Secret Manager / Secrets).';
  }
  if (safe.includes('NOT_FOUND') || safe.includes('404')) {
    return 'Model Gemini yang dipilih tidak tersedia atau tidak ditemukan.';
  }
  if (safe.includes('RESOURCE_EXHAUSTED') || safe.includes('429')) {
    return 'Kuota Gemini sementara penuh (429 RESOURCE_EXHAUSTED).';
  }
  if (safe.includes('UNAVAILABLE') || safe.includes('503')) {
    return 'Model Gemini sedang mengalami lonjakan trafik sementara (503 UNAVAILABLE) — coba lagi sesaat.';
  }
  return safe.slice(0, 400);
}

export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  maxAttempts = 3
): Promise<GenerateContentResponse> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw lastErr;
}

export async function testGeminiConnection(requestedModel?: string): Promise<{
  ok: boolean;
  keyConfigured: boolean;
  model: string;
  responseTimeMs: number;
  message: string;
  sampleOutput?: string;
  checkedAt: string;
}> {
  const checkedAt = new Date().toISOString();
  const model = resolveGeminiModel(requestedModel);
  const keyConfigured = isGeminiKeyConfigured();

  if (!keyConfigured) {
    return {
      ok: false,
      keyConfigured: false,
      model,
      responseTimeMs: 0,
      message: 'GEMINI_API_KEY belum terkonfigurasi di lingkungan server.',
      checkedAt,
    };
  }

  const startedAt = Date.now();
  try {
    const ai = getGeminiClient();
    const response = await generateContentWithRetry(
      ai,
      {
        model,
        contents: 'Balas tepat dengan dua kata: READY DST',
      },
      2
    );
    const responseTimeMs = Date.now() - startedAt;
    const text = (response.text ?? '').trim();
    return {
      ok: Boolean(text),
      keyConfigured: true,
      model,
      responseTimeMs,
      sampleOutput: text.slice(0, 120),
      message: text
        ? `Koneksi Gemini aktif (${model}, ${responseTimeMs}ms).`
        : `Gemini merespons tanpa output teks (${model}, ${responseTimeMs}ms).`,
      checkedAt,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      keyConfigured: true,
      model,
      responseTimeMs: Date.now() - startedAt,
      message: sanitizeGeminiError(err),
      checkedAt,
    };
  }
}

export function parseJsonSafely<T>(rawText: string | undefined, fallbackError: string): T {
  if (!rawText) {
    throw new Error(fallbackError);
  }
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

export { Type };
