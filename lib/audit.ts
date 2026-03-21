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
