import type { StudioStoreState } from '../types/studio';
import { PRELUXES_CLIENT_ID } from '../data/preluxesSeed';

export const STUDIO_STORAGE_KEY = 'studio_dst_store_v10';
export const LEGACY_STORAGE_KEYS = [
  'studio_dst_store_v9',
  'studio_dst_state_v9',
  'studio_dst_state',
  'dst_studio_data',
];
export const ROLLBACK_STORAGE_KEY = 'studio_dst_rollback_backup';


/**
 * Additive, idempotent backfill: bila klien bawaan seed (mis. Preluxes) belum ada di data
 * pengguna yang sudah tersimpan, tambahkan klien + workspace + channel + aset + penugasan user.
 * Tidak pernah menimpa atau menghapus data yang sudah ada.
 */
export function backfillSeedClient(
  state: StudioStoreState,
  seed: StudioStoreState,
  clientId: string
): StudioStoreState {
  const seedClient = seed.clients.find((c) => c.id === clientId);
  if (!seedClient || state.clients.some((c) => c.id === clientId)) return state;

  const seedWorkspace = seed.workspaces.find((w) => w.clientId === clientId);
  const seedChannels = seed.channels.filter((c) => c.clientId === clientId);
  const seedAssets = seed.assets.filter((a) => a.clientId === clientId);

  return {
    ...state,
    clients: [...state.clients, seedClient],
    workspaces:
      seedWorkspace && !state.workspaces.some((w) => w.clientId === clientId)
        ? [...state.workspaces, seedWorkspace]
        : state.workspaces,
    guidelines:
      seedWorkspace && seed.guidelines[seedWorkspace.id] && !state.guidelines[seedWorkspace.id]
        ? { ...state.guidelines, [seedWorkspace.id]: seed.guidelines[seedWorkspace.id] }
        : state.guidelines,
    channels: [
      ...state.channels,
      ...seedChannels.filter((c) => !state.channels.some((x) => x.id === c.id)),
    ],
    assets: [
      ...state.assets,
      ...seedAssets.filter((a) => !state.assets.some((x) => x.id === a.id)),
    ],
    users: state.users.map((u) => {
      const seedUser = seed.users.find((x) => x.id === u.id);
      const shouldHave = !!seedUser && seedUser.assignedClientIds.includes(clientId);
      // User dengan daftar kosong = akses ke semua klien (mis. ADMIN); jangan diubah.
      return shouldHave && u.assignedClientIds.length > 0 && !u.assignedClientIds.includes(clientId)
        ? { ...u, assignedClientIds: [...u.assignedClientIds, clientId] }
        : u;
    }),
  };
}

export function migrateStudioStorage(
  rawState: unknown,
  defaultSeed: StudioStoreState
): { state: StudioStoreState; migratedFromVersion: number | null } {
  if (!rawState || typeof rawState !== 'object') {
    return { state: defaultSeed, migratedFromVersion: null };
  }

  const candidate = rawState as Partial<StudioStoreState>;
  const previousVersion = typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 9;

  // Merge non-destructively: preserve existing user clients, briefs, studio boards, videos, wallet transactions, and system config
  const mergedClients =
    Array.isArray(candidate.clients) && candidate.clients.length > 0
      ? candidate.clients
      : defaultSeed.clients;

  const mergedWorkspaces =
    Array.isArray(candidate.workspaces) && candidate.workspaces.length > 0
      ? candidate.workspaces
      : defaultSeed.workspaces;

  // Ensure every existing client has at least a workspace if missing
  const workspaceByClient = new Set(mergedWorkspaces.map((w) => w.clientId));
  const backfilledWorkspaces = [...mergedWorkspaces];
  for (const client of mergedClients) {
    if (!workspaceByClient.has(client.id)) {
      const fallback = defaultSeed.workspaces.find((w) => w.clientId === client.id);
      if (fallback) {
        backfilledWorkspaces.push(fallback);
      } else {
        backfilledWorkspaces.push({
          id: `ws-${client.id}`,
          clientId: client.id,
          brandName: client.name,
          companyProfile: `${client.name} — ${client.industry}`,
          industry: client.industry || 'Creative & Media',
          targetAudience: 'Digital audience',
          productsServices: 'Content & Creative Campaigns',
          mission: 'NOT VERIFIED',
          vision: 'NOT VERIFIED',
          positioning: 'NOT VERIFIED',
          uvp: 'NOT VERIFIED',
          primaryColorPreview: '#05349B',
          secondaryColorPreview: '#FDCB02',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  const mergedState: StudioStoreState = {
    schemaVersion: 10,
    language: candidate.language === 'en' || candidate.language === 'id' ? candidate.language : defaultSeed.language,
    activeUserId: candidate.activeUserId || defaultSeed.activeUserId,
    activeClientId: candidate.activeClientId || defaultSeed.activeClientId,
    users: Array.isArray(candidate.users) && candidate.users.length > 0 ? candidate.users : defaultSeed.users,
    clients: mergedClients,
    workspaces: backfilledWorkspaces,
    assets: Array.isArray(candidate.assets) ? candidate.assets : defaultSeed.assets,
    guidelines: candidate.guidelines && typeof candidate.guidelines === 'object' ? { ...defaultSeed.guidelines, ...candidate.guidelines } : defaultSeed.guidelines,
    creativeDirections: Array.isArray(candidate.creativeDirections) ? candidate.creativeDirections : defaultSeed.creativeDirections,
    campaigns: Array.isArray(candidate.campaigns) ? candidate.campaigns : defaultSeed.campaigns,
    socialContents: Array.isArray(candidate.socialContents) ? candidate.socialContents : defaultSeed.socialContents,
    visualAudits: Array.isArray(candidate.visualAudits) ? candidate.visualAudits : defaultSeed.visualAudits,
    activityLogs: Array.isArray(candidate.activityLogs) ? candidate.activityLogs : defaultSeed.activityLogs,
    channels: Array.isArray(candidate.channels) && candidate.channels.length > 0 ? candidate.channels : defaultSeed.channels,
    briefs: Array.isArray(candidate.briefs) ? candidate.briefs : defaultSeed.briefs,
    studioBoards: Array.isArray(candidate.studioBoards) ? candidate.studioBoards : defaultSeed.studioBoards,
    videos: Array.isArray(candidate.videos) ? candidate.videos : defaultSeed.videos,
    walletTransactions: Array.isArray(candidate.walletTransactions) ? candidate.walletTransactions : defaultSeed.walletTransactions,
    systemConfig: {
      ...defaultSeed.systemConfig,
      ...(candidate.systemConfig ?? {}),
      googleFlowProjectId: candidate.systemConfig?.googleFlowProjectId || defaultSeed.systemConfig.googleFlowProjectId,
      googleFlowEndpointUrl: candidate.systemConfig?.googleFlowEndpointUrl || defaultSeed.systemConfig.googleFlowEndpointUrl,
      readyToPostFolderId: candidate.systemConfig?.readyToPostFolderId || defaultSeed.systemConfig.readyToPostFolderId,
    },
  };

  return {
    state: backfillSeedClient(mergedState, defaultSeed, PRELUXES_CLIENT_ID),
    migratedFromVersion: previousVersion < 10 ? previousVersion : null,
  };
}

export function loadStoreWithSafeMigration(defaultSeed: StudioStoreState): StudioStoreState {
  if (typeof window === 'undefined') return defaultSeed;

  try {
    const currentRaw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (currentRaw) {
      const parsed = JSON.parse(currentRaw);
      return migrateStudioStorage(parsed, defaultSeed).state;
    }

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = window.localStorage.getItem(legacyKey);
      if (legacyRaw) {
        // Save rollback backup before migrating
        window.localStorage.setItem(ROLLBACK_STORAGE_KEY, legacyRaw);
        const parsed = JSON.parse(legacyRaw);
        const { state } = migrateStudioStorage(parsed, defaultSeed);
        window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(state));
        return state;
      }
    }
  } catch (err) {
    console.warn('Safe migration fallback to seed due to parse error:', err);
  }

  return defaultSeed;
}

export function saveStoreSafely(state: StudioStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Unable to persist studio state to localStorage:', err);
  }
}
