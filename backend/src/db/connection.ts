import { MongoClient, type Db } from 'mongodb';
import { config } from '../config/env.js';

export class DatabaseUnavailableError extends Error {
  public statusCode = 503;
  constructor(
    message = 'Database service is temporarily unavailable. Please verify MongoDB Atlas connection and Network Access.'
  ) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionPromise: Promise<{ client: MongoClient; db: Db }> | null = null;

/**
 * Connect to MongoDB Atlas using the official Node.js driver.
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (client && db) {
    return { client, db };
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (!config.mongoUri) {
    const errorMsg = 'MongoDB connection aborted: MONGODB_URI environment variable is missing.';
    console.error(`[Database Error] ${errorMsg}`);
    throw new DatabaseUnavailableError(errorMsg);
  }

  connectionPromise = (async () => {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Database] Connecting to MongoDB Atlas (attempt ${attempt}/${maxAttempts})...`);
        const newClient = new MongoClient(config.mongoUri, {
          connectTimeoutMS: 20000,
          serverSelectionTimeoutMS: 20000,
        });

        await newClient.connect();
        const newDb = newClient.db(config.dbName);

        // Verify connectivity by sending ping command
        await newDb.command({ ping: 1 });

        client = newClient;
        db = newDb;

        console.log(`[Database] Connected successfully to MongoDB database: "${config.dbName}"`);
        return { client: newClient, db: newDb };
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
    throw new DatabaseUnavailableError(`Failed to connect to MongoDB database: ${message}`);
  })().finally(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}

/**
 * Get active MongoDB Db instance. Throws DatabaseUnavailableError if not initialized.
 */
export function getDb(): Db {
  if (!db) {
    throw new DatabaseUnavailableError();
  }
  return db;
}

/**
 * Get active MongoClient instance. Throws DatabaseUnavailableError if not initialized.
 */
export function getClient(): MongoClient {
  if (!client) {
    throw new DatabaseUnavailableError();
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
