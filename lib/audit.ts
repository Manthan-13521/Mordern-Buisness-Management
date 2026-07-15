/**
 * @deprecated DEAD CODE — logAudit() is never called anywhere in the codebase.
 *
 * Audit logging is now handled by:
 *   - lib/logger.ts → logger.audit()  (pool/hostel/auth events, pino-based)
 *   - lib/auditLog.ts → auditLog.financial() / auditLog.security()  (business events, pino-based)
 *
 * This file can be deleted after team confirmation that the AuditLog MongoDB
 * collection is not queried by any external tool (e.g. scripts, dashboards).
 *
 * TODO: Remove this file once confirmed safe.
 */
import { dbConnect } from './mongodb'
import { AuditLog } from '@/models/AuditLog'

export async function logAudit(action: string, entity: string, entityId: string, performedBy: string, details?: any) {
    await dbConnect();
    await AuditLog.create({
        action,
        entity,
        entityId,
        performedBy,
        details: JSON.stringify(details),
        createdAt: new Date()
    })
}
