import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Administrative routes are locked to ADMIN role
router.use(authenticate, requireRole('ADMIN'));

router.get('/audit', AdminController.getAuditLogs);
router.get('/audit/verify', AdminController.verifyAuditIntegrity);
router.get('/alerts', AdminController.getSecurityAlerts);
router.get('/users', AdminController.listUsers);
router.patch('/users/:id/status', AdminController.toggleUserStatus);

export default router;
