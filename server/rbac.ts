import type { Request, Response, NextFunction } from 'express';
import { hasRolePermission, type RbacAction } from '../src/utils/brandLogic.ts';
import type { Role } from '../src/types/studio.ts';

export interface AuthContext {
  userId: string;
  userName: string;
  role: Role;
  assignedClientIds: string[];
}

const VALID_ROLES: Role[] = ['ADMIN', 'PM', 'VISUAL_MAKER', 'VIDEO_MAKER'];

export function extractAuthContext(req: Request): AuthContext {
  const roleHeader = String(req.header('x-dst-role') || 'ADMIN').toUpperCase() as Role;
  const role: Role = VALID_ROLES.includes(roleHeader) ? roleHeader : 'ADMIN';
  const userId = String(req.header('x-dst-user-id') || 'user-admin');
  const userName = String(req.header('x-dst-user-name') || 'Aldy Pratama');
  const assignedRaw = String(req.header('x-dst-client-ids') || '');
  const assignedClientIds = assignedRaw
    ? assignedRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return { userId, userName, role, assignedClientIds };
}

export function requirePermission(action: RbacAction, clientIdResolver?: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = extractAuthContext(req);
    const clientId = clientIdResolver ? clientIdResolver(req) : undefined;
    const ok = hasRolePermission(auth.role, action, clientId, auth.assignedClientIds);
    if (!ok) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Role ${auth.role} is not authorized to perform ${action}${clientId ? ` for client ${clientId}` : ''}.`,
      });
      return;
    }
    next();
  };
}
