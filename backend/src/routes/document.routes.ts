import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller.js';
import { AiController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { AuditService } from '../services/audit.service.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Configure Multer in-memory storage for immediate magic-byte inspection before disk persistence
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB maximum limit
  },
});

// All document routes require authentication
router.use(authenticate);

// Security Overview endpoints (available to all authenticated roles)
router.get('/security/verify-chain', async (_req, res) => {
  try {
    const result = await AuditService.verifyIntegrity();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

router.get('/security/events', async (_req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalDenials, recentDenials, totalAudits] = await Promise.all([
      prisma.auditLog.count({ where: { status: 'DENIED', timestamp: { gte: oneDayAgo } } }),
      prisma.auditLog.findMany({
        where: { status: 'DENIED' },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: { id: true, timestamp: true, action: true, status: true, actorIp: true, details: true },
      }),
      prisma.auditLog.count(),
    ]);

    return res.json({
      totalDenialsLast24h: totalDenials,
      totalAuditedRecords: totalAudits,
      recentDenials,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Document CRUD & Streaming
router.post('/upload', upload.single('file'), DocumentController.upload);
router.get('/', DocumentController.list);
router.get('/:id', DocumentController.getById);
router.get('/:id/download', DocumentController.download);
router.patch('/:id', DocumentController.update);
router.delete('/:id', DocumentController.delete);

// Permissions & Access Control (Owners only)
router.get('/:id/grants', DocumentController.getGrants);
router.post('/:id/grants', DocumentController.grantAccess);
router.delete('/:id/grants/:userId', DocumentController.revokeAccess);

// AI-Assisted Access Recommendations (Advisory Only)
router.post('/:id/ai-suggest', AiController.suggestAccess);
router.post('/:id/ai-approve', AiController.approveRecommendation);

export default router;
