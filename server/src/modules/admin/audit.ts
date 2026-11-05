import { AuditLog } from '../../models/auditLog.js';
import { logger } from '../../utils/logger.js';

/** Record an admin action in the DB and the structured log. `meta` must not contain PII. */
export async function audit(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, unknown>,
) {
  await AuditLog.create({ admin: adminId, action, entity, entityId, meta });
  logger.info({ adminId, action, entity, entityId }, 'admin action');
}
