import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AuditService } from '../services/audit.service.js';
import { AuthenticatedRequest } from '../types/index.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'DOCUMENT_OWNER', 'VIEWER']).default('VIEWER'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  static async register(req: Request, res: Response) {
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
      }

      const { email, password, name, role } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Conflict', message: 'A user with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role,
        },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });

      await AuditService.log({
        actorId: user.id,
        actorEmail: user.email,
        actorIp,
        action: 'AUTH_REGISTER',
        resourceId: user.id,
        resourceType: 'USER',
        status: 'SUCCESS',
        details: { role: user.role, name: user.name },
      });

      const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '8h' });

      return res.status(201).json({
        message: 'User registered successfully.',
        user,
        token,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    const actorIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation Error', details: parsed.error.format() });
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        await AuditService.log({
          actorId: user ? user.id : null,
          actorEmail: email,
          actorIp,
          action: 'ACCESS_DENIED',
          status: 'DENIED',
          details: { reason: 'Failed authentication attempt: user not found or deactivated' },
        });
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials or inactive account.' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        await AuditService.log({
          actorId: user.id,
          actorEmail: user.email,
          actorIp,
          action: 'ACCESS_DENIED',
          status: 'DENIED',
          details: { reason: 'Failed authentication attempt: incorrect password' },
        });
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials or inactive account.' });
      }

      const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '8h' });

      await AuditService.log({
        actorId: user.id,
        actorEmail: user.email,
        actorIp,
        action: 'AUTH_LOGIN',
        status: 'SUCCESS',
        details: { role: user.role },
      });

      return res.json({
        message: 'Login successful.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    return res.json({ user: req.user });
  }
}
