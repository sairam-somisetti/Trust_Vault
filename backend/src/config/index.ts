import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'trustvault-super-secure-jwt-secret-minimum-32-chars-key',
  jwtExpiresIn: '8h',
  encryptionMasterKeyHex: process.env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  storageDir: path.resolve(process.env.STORAGE_DIR || './storage/private'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// Ensure private storage directory exists outside public webroot
if (!fs.existsSync(config.storageDir)) {
  fs.mkdirSync(config.storageDir, { recursive: true });
}
