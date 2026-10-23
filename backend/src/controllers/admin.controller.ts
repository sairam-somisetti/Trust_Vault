import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuditService } from '../services/audit.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AdminController {
  /**
   * Retrieves complete system audit trail with filtering for compliance officers and administrators.
   */
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const { actorId, resourceId, action, status, startDate, endDate, page, limit } = req.query;

      const result = await AuditService.getLogs({
        actorId: actorId as string,
        resourceId: resourceId as string,
        action: action as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Runs the cryptographic verification algorithm across the entire hash chain.
   * Proves mathematically whether any record has been quietly altered or deleted.
   */
  static async verifyAuditIntegrity(req: AuthenticatedRequest, res: Response) {
    const actor = req.user!;
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    try {
      const verification = await AuditService.verifyIntegrity();

      await AuditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorIp,
        action: 'AUDIT_VERIFIED',
        resourceType: 'SYSTEM',
        status: verification.valid ? 'SUCCESS' : 'DENIED',
        details: verification,
      });

      return res.json(verification);
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Surfaces security anomalies and refused access attempts worth noticing.
   */
  static async getSecurityAlerts(_req: AuthenticatedRequest, res: Response) {
    try {
      // Find denied access attempts in the past 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const deniedEvents = await prisma.auditLog.findMany({
        where: {
          status: 'DENIED',
          timestamp: { gte: oneDayAgo },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      // Group anomalies by IP and Actor
      const ipCounts: Record<string, number> = {};
      const actorCounts: Record<string, number> = {};

      for (const event of deniedEvents) {
        ipCounts[event.actorIp] = (ipCounts[event.actorIp] || 0) + 1;
        if (event.actorEmail) {
          actorCounts[event.actorEmail] = (actorCounts[event.actorEmail] || 0) + 1;
        }
      }

      const suspiciousIps = Object.entries(ipCounts)
        .filter(([_, count]) => count >= 3)
        .map(([ip, count]) => ({ ip, count, alertLevel: count > 10 ? 'HIGH' : 'MEDIUM' }));

      const suspiciousActors = Object.entries(actorCounts)
        .filter(([_, count]) => count >= 3)
        .map(([email, count]) => ({ email, count, alertLevel: count > 10 ? 'HIGH' : 'MEDIUM' }));

      return res.json({
        totalDeniedEventsLast24h: deniedEvents.length,
        suspiciousIps,
        suspiciousActors,
        recentDenials: deniedEvents.slice(0, 15),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Lists system users and their active states.
   */
  static async listUsers(_req: AuthenticatedRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              ownedDocuments: true,
              grants: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ users });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Toggles active state of a user. Immediate session cutoff.
   */
  static async toggleUserStatus(req: AuthenticatedRequest, res: Response) {
    const targetUserId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { isActive } = req.body;

    try {
      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { isActive: Boolean(isActive) },
        select: { id: true, email: true, isActive: true },
      });

      return res.json({
        message: `User ${updated.email} status updated to ${updated.isActive ? 'active' : 'suspended'}.`,
        user: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}
