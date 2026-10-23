import { app } from './app.js';
import { config } from './config/index.js';

app.listen(config.port, '0.0.0.0', () => {
  console.log(`=====================================================`);
  console.log(` TrustVault API Server running on port ${config.port}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Storage Path: ${config.storageDir}`);
  console.log(` Cryptographic Audit Trail: ACTIVE (SHA-256 Chained)`);
  console.log(`=====================================================`);
});
