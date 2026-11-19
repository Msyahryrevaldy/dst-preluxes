import type { UserAccount } from '../types/studio';

export function buildAuthHeaders(user: UserAccount): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-dst-user-id': user.id,
    'x-dst-user-name': user.name,
    'x-dst-role': user.role,
    'x-dst-client-ids': user.assignedClientIds.join(','),
  };
}

export async function apiRequest<T>(
  url: string,
  user: UserAccount,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const resp = await fetch(url, {
    method: options?.method ?? 'POST',
    headers: buildAuthHeaders(user),
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed (${resp.status})`);
  }
  return payload as T;
}
