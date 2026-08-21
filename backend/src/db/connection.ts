import { MongoClient, type Db } from 'mongodb';
import { config } from '../config/env.js';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB Atlas using the official Node.js driver.
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (client && db) {
    return { client, db };
  }

  if (!config.mongoUri) {
    const errorMsg = 'MongoDB connection aborted: MONGODB_URI environment variable is missing.';
    console.error(`[Database Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Database] Connecting to MongoDB Atlas (attempt ${attempt}/${maxAttempts})...`);
      client = new MongoClient(config.mongoUri, {
        connectTimeoutMS: 20000,
        serverSelectionTimeoutMS: 20000,
      });

      await client.connect();
      db = client.db(config.dbName);

      // Verify connectivity by sending ping command
      await db.command({ ping: 1 });

      console.log(`[Database] Connected successfully to MongoDB database: "${config.dbName}"`);
      return { client, db };
    } catch (error) {
      client = null;
      db = null;
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Database Warning] Attempt ${attempt} failed: ${message}`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`[Database Error] Failed to connect to MongoDB after ${maxAttempts} attempts: ${message}`);
  throw lastError;
}

/**
 * Get active MongoDB Db instance. Throws if not initialized.
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('Database is not initialized. Call connectToDatabase() first.');
  }
  return db;
}

/**
 * Get active MongoClient instance. Throws if not initialized.
 */
export function getClient(): MongoClient {
  if (!client) {
    throw new Error('MongoClient is not initialized. Call connectToDatabase() first.');
  }
  return client;
}

/**
 * Check if database is currently connected.
 */
export function isDbConnected(): boolean {
  return db !== null && client !== null;
}

/**
 * Gracefully close the MongoDB connection.
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    console.log('[Database] Closing MongoDB connection...');
    await client.close();
    client = null;
    db = null;
    console.log('[Database] MongoDB connection closed.');
  }
}
