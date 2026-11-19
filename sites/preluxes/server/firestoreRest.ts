import fs from 'node:fs';
import path from 'node:path';

export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
export const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(configPath, 'utf8')
);

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
const FIRESTORE_COMMIT = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}:commit`;
const FIRESTORE_QUERY = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery`;

export const DOC_PREFIX = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/`;

export interface FirestoreValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

export interface FirestoreDoc<T = Record<string, unknown>> {
  id: string;
  name: string;
  updateTime: string;
  data: T;
}

export function encodeValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === 'string') {
    // Detect strict ISO UTC timestamps for Firestore timestamp fields when passed via encodeFields
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => encodeValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = encodeValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function encodeFields(
  obj: Record<string, unknown>,
  timestampKeys: string[] = []
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (timestampKeys.includes(k) && typeof v === 'string' && v.length > 0) {
      fields[k] = { timestampValue: v };
    } else {
      fields[k] = encodeValue(v);
    }
  }
  return fields;
}

export function decodeValue(val: FirestoreValue | undefined): unknown {
  if (!val) return undefined;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((item) => decodeValue(item));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeValue(v);
    }
    return out;
  }
  return null;
}

export function decodeDocument<T = Record<string, unknown>>(raw: {
  name: string;
  fields?: Record<string, FirestoreValue>;
  updateTime?: string;
}): FirestoreDoc<T> {
  const parts = raw.name.split('/');
  const id = parts[parts.length - 1];
  const data: Record<string, unknown> = {};
  if (raw.fields) {
    for (const [k, v] of Object.entries(raw.fields)) {
      data[k] = decodeValue(v);
    }
  }
  return {
    id,
    name: raw.name,
    updateTime: raw.updateTime || '',
    data: data as T,
  };
}

function authHeaders(idToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  return headers;
}

export async function getDocument<T = Record<string, unknown>>(
  docPath: string,
  idToken?: string
): Promise<FirestoreDoc<T> | null> {
  const res = await fetch(`${FIRESTORE_BASE}/${docPath}`, {
    method: 'GET',
    headers: authHeaders(idToken),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore GET ${docPath} failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as {
    name: string;
    fields?: Record<string, FirestoreValue>;
    updateTime?: string;
  };
  return decodeDocument<T>(json);
}

export async function runStructuredQuery<T = Record<string, unknown>>(
  collectionId: string,
  options: {
    whereField?: string;
    whereValue?: string | boolean;
    limit?: number;
    idToken?: string;
  } = {}
): Promise<FirestoreDoc<T>[]> {
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId }],
    limit: options.limit ?? 100,
  };
  if (options.whereField !== undefined && options.whereValue !== undefined) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: options.whereField },
        op: 'EQUAL',
        value:
          typeof options.whereValue === 'boolean'
            ? { booleanValue: options.whereValue }
            : { stringValue: options.whereValue },
      },
    };
  }
  const res = await fetch(FIRESTORE_QUERY, {
    method: 'POST',
    headers: authHeaders(options.idToken),
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore runQuery ${collectionId} failed (${res.status}): ${text}`);
  }
  const rows = (await res.json()) as Array<{
    document?: { name: string; fields?: Record<string, FirestoreValue>; updateTime?: string };
  }>;
  return rows.filter((r) => Boolean(r.document)).map((r) => decodeDocument<T>(r.document!));
}

export interface CommitWrite {
  update?: {
    name: string;
    fields: Record<string, FirestoreValue>;
  };
  updateMask?: { fieldPaths: string[] };
  currentDocument?: { exists?: boolean; updateTime?: string };
  updateTransforms?: Array<{
    fieldPath: string;
    setToServerValue: 'REQUEST_TIME';
  }>;
  delete?: string;
}

export async function commitWrites(writes: CommitWrite[], idToken?: string): Promise<void> {
  const res = await fetch(FIRESTORE_COMMIT, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ writes }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Firestore commit failed (${res.status}): ${text}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
}
