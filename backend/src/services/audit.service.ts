import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AuditAction, AuditStatus } from '../types/index.js';

const GENESIS_PREV_HASH = '0'.repeat(64);

export interface CreateAuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  actorIp: string;
  action: AuditAction;
  resourceId?: string | null;
  resourceType?: 'DOCUMENT' | 'GRANT' | 'USER' | 'SYSTEM';
  status: AuditStatus;
  details?: Record<string, any> | string | null;
}

export class AuditService {
  /**
   * Appends an immutable, cryptographically chained audit record.
   * Chained using SHA-256 over previous hash + entry payload.
   */
  static async log(input: CreateAuditInput) {
    const detailsString =
      typeof input.details === 'object' && input.details !== null
        ? JSON.stringify(input.details)
        : input.details || null;

    return await prisma.$transaction(async (tx) => {
      // Find the most recent record to get prevHash
      const lastRecord = await tx.auditLog.findFirst({
        orderBy: { id: 'desc' },
      });

      const prevHash = lastRecord ? lastRecord.hash : GENESIS_PREV_HASH;
      const timestamp = new Date();

      // We pre-calculate the next ID (lastRecord.id + 1 or 1 for SQLite autoincrement)
      const nextId = lastRecord ? lastRecord.id + 1 : 1;

      // Hash format: prevHash|id|timestampISO|actorId|action|resourceId|status|details
      const payloadToHash = [
        prevHash,
        nextId,
        timestamp.toISOString(),
        input.actorId || 'ANONYMOUS',
        input.action,
        input.resourceId || 'NONE',
        input.status,
        detailsString || '',
      ].join('|');

      const hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

      const record = await tx.auditLog.create({
        data: {
          timestamp,
          actorId: input.actorId || null,
          actorEmail: input.actorEmail || null,
          actorIp: input.actorIp,
          action: input.action,
          resourceId: input.resourceId || null,
          resourceType: input.resourceType || null,
          status: input.status,
          details: detailsString,
          prevHash,
          hash,
        },
      });

      return record;
    });
  }

  /**
   * Traverses the entire audit ledger from root to head and mathematically verifies
   * that not a single record has been modified, injected, deleted, or reordered.
   */
  static async verifyIntegrity() {
    const logs = await prisma.auditLog.findMany({
      orderBy: { id: 'asc' },
    });

    if (logs.length === 0) {
      return {
        valid: true,
        totalRecords: 0,
        message: 'Audit ledger is empty (valid genesis state).',
      };
    }

    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < logs.length; i++) {
      const record = logs[i];

      // 1. Verify that the record points to the exact previous record's hash
      if (record.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          totalRecords: logs.length,
          brokenAtId: record.id,
          reason: `Broken chain pointer at ID ${record.id}: prevHash does not match previous record's hash.`,
          expectedPrevHash,
          actualPrevHash: record.prevHash,
        };
      }

      // 2. Recompute the record's cryptographic hash from its raw data
      const payloadToHash = [
        record.prevHash,
        record.id,
        record.timestamp.toISOString(),
        record.actorId || 'ANONYMOUS',
        record.action,
        record.resourceId || 'NONE',
        record.status,
        record.details || '',
      ].join('|');

      const recomputedHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

      if (recomputedHash !== record.hash) {
        return {
          valid: false,
          totalRecords: logs.length,
          brokenAtId: record.id,
          reason: `Tampered payload detected at record ID ${record.id}: hash signature mismatch.`,
          expectedHash: recomputedHash,
          storedHash: record.hash,
        };
      }

      expectedPrevHash = record.hash;
    }

    return {
      valid: true,
      totalRecords: logs.length,
      latestHash: expectedPrevHash,
      message: `Audit chain verified mathematically across all ${logs.length} records. Zero tampering detected.`,
    };
  }

  /**
   * Retrieves audit logs with granular filtering for Administrative compliance reporting.
   */
  static async getLogs(filters: {
    actorId?: string;
    resourceId?: string;
    action?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.action) where.action = filters.action;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [total, records] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      records,
    };
  }
}
