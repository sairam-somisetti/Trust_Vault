import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller.js';
import { AiController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

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
