import { createApp } from './app.js';
import { config, validateConfig } from './config/env.js';
import { connectToDatabase, closeDatabase } from './db/connection.js';
import { initUserIndexes } from './services/user.service.js';
import { initDocumentIndexes } from './services/document.service.js';

async function startServer(): Promise<void> {
  const { warnings, errors } = validateConfig();

  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`[Config Warning] ${w}`));
  }

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`[Config Error] ${e}`));
  }

  // Attempt database connection and index bootstrap
  try {
    await connectToDatabase();
    await initUserIndexes();
    await initDocumentIndexes();
  } catch (_error) {
    console.warn(
      '[Startup Note] Server initialized without active MongoDB connection. Configure MONGODB_URI to enable database functionality.'
    );
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`========================================`);
    console.log(`  UNFOLD Backend API running on port ${config.port}`);
    console.log(`  Health endpoint: http://localhost:${config.port}/api/health`);
    console.log(`  Environment:     ${config.nodeEnv}`);
    console.log(`  AI Model:        ${config.geminiModel} (Key set: ${Boolean(config.geminiApiKey)})`);
    console.log(`========================================`);
  });

  // Graceful shutdown handlers
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server stopped accepting connections.');
      await closeDatabase();
      process.exit(0);
    });

    // Fallback safety timeout
    setTimeout(() => {
      console.error('[Server] Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Fatal Error] Failed to start server:', err);
  process.exit(1);
});
