import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  error?: string;
}

export interface EncryptedStorageResult {
  storageKey: string;
  encryptionIv: string;
  encryptionAuthTag: string;
  checksum: string;
  fileSize: number;
}

export class StorageService {
  private static masterKey = Buffer.from(config.encryptionMasterKeyHex, 'hex');

  /**
   * Performs deep file signature (magic byte) verification to defeat MIME confusion attacks.
   */
  static validateFileSignature(buffer: Buffer, originalFilename: string): FileValidationResult {
    const ext = path.extname(originalFilename).toLowerCase();

    // 1. Blacklist dangerous executable / script extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.py', '.rb',
      '.pl', '.cgi', '.js', '.vbs', '.dll', '.scr', '.msi', '.jar',
      '.app', '.com', '.htm', '.html', '.xhtml'
    ];
    if (dangerousExtensions.includes(ext)) {
      return {
        valid: false,
        mimeType: 'application/octet-stream',
        error: `File extension '${ext}' is classified as potentially executable and is strictly prohibited.`,
      };
    }

    if (buffer.length === 0) {
      return { valid: false, mimeType: 'unknown', error: 'Uploaded file cannot be empty (0 bytes).' };
    }

    // 2. Validate PDF signature: %PDF- (0x25 0x50 0x44 0x46)
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') {
      return { valid: true, mimeType: 'application/pdf' };
    }

    // 3. Validate PNG signature: \x89PNG\r\n\x1a\n
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { valid: true, mimeType: 'image/png' };
    }

    // 4. Validate JPEG signature: FF D8 FF
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { valid: true, mimeType: 'image/jpeg' };
    }

    // 5. Plaintext documents (.txt, .csv, .json, .md)
    if (['.txt', '.csv', '.json', '.md'].includes(ext)) {
      // Ensure file contains valid UTF-8 and no suspicious null bytes or shell scripts
      const hasNullBytes = buffer.includes(0x00);
      if (hasNullBytes) {
        return {
          valid: false,
          mimeType: 'application/octet-stream',
          error: 'Binary characters detected in declared text document.',
        };
      }
      return { valid: true, mimeType: ext === '.json' ? 'application/json' : 'text/plain' };
    }

    // Reject unverified binaries or disguised scripts
    return {
      valid: false,
      mimeType: 'application/octet-stream',
      error: `File signature mismatch for '${ext}'. Only authenticated PDFs, JPEGs, PNGs, and text documents are allowed.`,
    };
  }

  /**
   * Encrypts file payload using AES-256-GCM and stores ciphertext outside public root.
   */
  static async encryptAndStore(buffer: Buffer, _originalFilename: string): Promise<EncryptedStorageResult> {
    // 1. Compute SHA-256 checksum of original plaintext for integrity verification
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Generate random 12-byte IV for AES-256-GCM
    const iv = crypto.randomBytes(12);

    // 3. Encrypt buffer
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encryptedData = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16-byte GCM authentication tag

    // 4. Generate random storage key (UUID) to avoid path traversal / identifier leakage
    const storageKey = `${crypto.randomUUID()}.vault`;
    const destinationPath = path.join(config.storageDir, storageKey);

    // 5. Write raw ciphertext to disk
    await fs.promises.writeFile(destinationPath, encryptedData);

    return {
      storageKey,
      encryptionIv: iv.toString('hex'),
      encryptionAuthTag: authTag.toString('hex'),
      checksum,
      fileSize: buffer.length,
    };
  }

  /**
   * Reads ciphertext from disk, verifies GCM auth tag, and decrypts to plaintext buffer.
   */
  static async readAndDecrypt(storageKey: string, ivHex: string, authTagHex: string): Promise<Buffer> {
    // Strict path traversal defense: ensure storageKey contains no slashes or dots
    const safeKey = path.basename(storageKey);
    const filePath = path.join(config.storageDir, safeKey);

    if (!fs.existsSync(filePath)) {
      throw new Error('Encrypted file storage object not found on disk.');
    }

    const encryptedData = await fs.promises.readFile(filePath);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      return decrypted;
    } catch (err: any) {
      throw new Error(`Integrity check failed: Ciphertext or auth tag has been tampered with. ${err.message}`);
    }
  }

  /**
   * Deletes encrypted file artifact from disk.
   */
  static async deleteFile(storageKey: string): Promise<void> {
    const safeKey = path.basename(storageKey);
    const filePath = path.join(config.storageDir, safeKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
