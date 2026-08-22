import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../db/connection.js';
import type { UserDocument, SummaryLengthPreference, UserPreferences } from '../models/user.model.js';

const USERS_COLLECTION = 'users';

export function getUsersCollection(): Collection<UserDocument> {
  return getDb().collection<UserDocument>(USERS_COLLECTION);
}

/**
 * Initializes database indexes for the users collection.
 * Creates a unique index on normalized email.
 */
export async function initUserIndexes(): Promise<void> {
  try {
    const collection = getUsersCollection();
    await collection.createIndex({ email: 1 }, { unique: true, name: 'uniq_user_email' });
    console.log('[Database] Users collection indexes verified.');
  } catch (error) {
    console.error('[Database Error] Failed to initialize user indexes:', error);
  }
}

/**
 * Normalizes email address to lowercase and trimmed string.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Finds a user by normalized email address.
 */
export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  const normalized = normalizeEmail(email);
  const collection = getUsersCollection();
  return collection.findOne({ email: normalized });
}

/**
 * Finds a user by MongoDB ObjectId string.
 */
export async function findUserById(id: string): Promise<UserDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const collection = getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  defaultSummaryLength?: SummaryLengthPreference;
}

/**
 * Inserts a new user record into the users collection.
 */
export async function createUser(input: CreateUserInput): Promise<UserDocument> {
  const normalized = normalizeEmail(input.email);
  const now = new Date();

  const userDoc: Omit<UserDocument, '_id'> = {
    name: input.name.trim(),
    email: normalized,
    passwordHash: input.passwordHash,
    preferences: {
      defaultSummaryLength: input.defaultSummaryLength || 'Medium',
      emailNotification: true,
    },
    createdAt: now,
    updatedAt: now,
  };

  const collection = getUsersCollection();
  const result = await collection.insertOne(userDoc as UserDocument);

  return {
    _id: result.insertedId,
    ...userDoc,
  };
}

export interface UpdateUserSettingsInput {
  name?: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * Updates a user's name and/or preferences in the users collection.
 */
export async function updateUserSettings(
  userId: string,
  input: UpdateUserSettingsInput
): Promise<UserDocument | null> {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  const collection = getUsersCollection();
  const existingUser = await collection.findOne({ _id: new ObjectId(userId) });
  if (!existingUser) {
    return null;
  }

  const now = new Date();
  const updatedName = input.name !== undefined ? input.name.trim() : existingUser.name;
  const updatedPreferences: UserPreferences = {
    defaultSummaryLength:
      input.preferences?.defaultSummaryLength ||
      existingUser.preferences?.defaultSummaryLength ||
      'Medium',
    emailNotification:
      input.preferences?.emailNotification !== undefined
        ? Boolean(input.preferences.emailNotification)
        : existingUser.preferences?.emailNotification ?? true,
  };

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $set: {
        name: updatedName,
        preferences: updatedPreferences,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );

  return result;
}
