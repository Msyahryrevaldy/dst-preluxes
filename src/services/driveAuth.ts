import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');

// Strictly in-memory token caching (never localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

export function initDriveAuth(
  onAuthSuccess?: (user: User, hasToken: boolean) => void,
  onAuthCleared?: () => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, true);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthSuccess?.(user, false);
      }
    } else {
      cachedAccessToken = null;
      onAuthCleared?.();
    }
  });
}

export async function signInGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Token akses Google Drive tidak tersedia dari sesi autentikasi.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogleDrive(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export function getInMemoryDriveToken(): string | null {
  return cachedAccessToken;
}

export async function listDriveFolderFiles(folderId: string): Promise<DriveFileSummary[]> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Harap masuk dengan Google terlebih dahulu untuk mengakses Google Drive.');
  }
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,modifiedTime,webViewLink,size)');
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=50`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google Drive API error (${resp.status}): ${errText}`);
  }
  const data = (await resp.json()) as { files?: DriveFileSummary[] };
  return data.files ?? [];
}

export async function findOrCreateBrandLibraryFolder(
  rootFolderName: string,
  clientName: string
): Promise<{ rootFolderId: string; clientFolderId: string }> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Token Google Drive tidak aktif.');
  }

  const findFolder = async (name: string, parentId?: string): Promise<string | null> => {
    const parentClause = parentId ? ` and '${parentId}' in parents` : '';
    const q = encodeURIComponent(
      `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`
    );
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Gagal mencari folder Drive (${resp.status})`);
    const data = (await resp.json()) as { files?: Array<{ id: string }> };
    return data.files?.[0]?.id ?? null;
  };

  const createFolder = async (name: string, parentId?: string): Promise<string> => {
    const resp = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    });
    if (!resp.ok) throw new Error(`Gagal membuat folder Drive (${resp.status})`);
    const created = (await resp.json()) as { id: string };
    return created.id;
  };

  let rootFolderId = await findFolder(rootFolderName);
  if (!rootFolderId) {
    rootFolderId = await createFolder(rootFolderName);
  }

  let clientFolderId = await findFolder(clientName, rootFolderId);
  if (!clientFolderId) {
    clientFolderId = await createFolder(clientName, rootFolderId);
  }

  return { rootFolderId, clientFolderId };
}

export async function uploadFileToBrandLibraryDrive(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  fileBlob: Blob;
}): Promise<{ id: string; name: string; webViewLink?: string }> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Token Google Drive tidak aktif.');
  }

  const metadata = {
    name: params.fileName,
    parents: [params.folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', params.fileBlob, params.fileName);

  const resp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Upload ke Google Drive gagal (${resp.status}): ${errText}`);
  }
  return (await resp.json()) as { id: string; name: string; webViewLink?: string };
}
