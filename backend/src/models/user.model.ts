import { ObjectId } from 'mongodb';

export type SummaryLengthPreference = 'Short' | 'Medium' | 'Long';

export interface UserPreferences {
  defaultSummaryLength: SummaryLengthPreference;
  emailNotification: boolean;
}

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

/**
 * Converts a database user document into a safe user object (excluding passwordHash).
 */
export function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    preferences: user.preferences ?? {
      defaultSummaryLength: 'Medium',
      emailNotification: true,
    },
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
