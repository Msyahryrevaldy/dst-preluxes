import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_STUDIO_STATE } from '../src/data/seedData.ts';
import type { StudioStoreState } from '../src/types/studio.ts';
import { backfillSeedClient } from '../src/utils/storageMigration.ts';
import { PRELUXES_CLIENT_ID } from '../src/data/preluxesSeed.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'studio-dst-store.json');

let cachedStore: StudioStoreState | null = null;

export function getServerStore(): StudioStoreState {
  if (cachedStore) return cachedStore;

  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StudioStoreState;
      if (parsed && Array.isArray(parsed.workspaces)) {
        if (!parsed.systemConfig?.googleFlowEndpointUrl?.trim()) {
          parsed.systemConfig = {
            ...INITIAL_STUDIO_STATE.systemConfig,
            ...(parsed.systemConfig ?? {}),
            googleFlowEndpointUrl: INITIAL_STUDIO_STATE.systemConfig.googleFlowEndpointUrl,
          };
          saveServerStore(parsed);
        }
        const withPreluxes = backfillSeedClient(parsed, INITIAL_STUDIO_STATE, PRELUXES_CLIENT_ID);
        if (withPreluxes !== parsed) saveServerStore(withPreluxes);
        cachedStore = withPreluxes;
        return cachedStore;
      }
    }
  } catch (err) {
    console.warn('Could not read persisted server store, initializing from seed:', err);
  }

  cachedStore = structuredClone(INITIAL_STUDIO_STATE);
  saveServerStore(cachedStore);
  return cachedStore;
}

export function saveServerStore(next: StudioStoreState): void {
  cachedStore = next;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write server store file:', err);
  }
}

export function resetOrRestoreStore(restored: StudioStoreState): StudioStoreState {
  saveServerStore(restored);
  return restored;
}
