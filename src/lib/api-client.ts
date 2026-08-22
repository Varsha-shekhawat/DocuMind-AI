export interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    defaultSummaryLength: 'Short' | 'Medium' | 'Long';
    emailNotification: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export type DocumentStatus = 'Processing' | 'Ready' | 'Needs attention';
export type DocumentAccent = 'ochre' | 'terracotta' | 'sage' | 'bluegreen' | 'plum';

export interface DocumentSummaryVariants {
  short: string;
  medium: string;
  long: string;
}

export type DocumentStage = 'uploaded' | 'extracting' | 'analyzing' | 'ready' | 'failed';

export interface ApiDocument {
  id: string;
  userId: string;
  name: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  stage: DocumentStage;
  pages: number;
  words: string;
  description: string;
  summary: string;
  summaryVariants: DocumentSummaryVariants;
  keyPoints: string[];
  mainIdeas: { title: string; body: string }[];
  suggestions: string[];
  accent: DocumentAccent;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  user?: User;
  document?: ApiDocument;
  documents?: ApiDocument[];
  token?: string;
  error?: {
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * In-memory (never persisted) fallback auth token.
 *
 * The backend's HttpOnly cookie is the primary, persistent session mechanism.
 * This module-level variable exists purely as a same-tab fallback: some
 * cross-origin deployments and browsers with strict third-party cookie
 * policies will silently refuse to attach the cookie to a fetch request even
 * though login just succeeded. Holding the token in memory (never
 * localStorage/sessionStorage) lets those same-tab requests still succeed
 * without weakening security -- it disappears on refresh, at which point the
 * app falls back to the cookie via /api/auth/me as usual.
 */
let inMemoryToken: string | null = null;

export function setInMemoryToken(token: string | null): void {
  inMemoryToken = token;
}

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Base HTTP request wrapper with JSON serialization and credentials (cookies) included.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers || {});
  // Only set Content-Type to JSON if not sending FormData
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  // Same-tab fallback: attach the in-memory token so the request still
  // authenticates even if the browser declined to send the HttpOnly cookie.
  if (!headers.has('Authorization') && inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures HTTP-only auth cookies are transmitted
  });

  let responseData: ApiResponse<T>;
  try {
    responseData = await response.json();
  } catch (_parseErr) {
    if (!response.ok) {
      throw new ApiError(`Request failed with HTTP status ${response.status}`, response.status);
    }
    return {} as T;
  }

  if (!response.ok || responseData.success === false) {
    const message = responseData.error?.message || responseData.message || 'An unexpected error occurred';
    const status = responseData.error?.statusCode || response.status;
    throw new ApiError(message, status, responseData.error?.details);
  }

  return responseData as unknown as T;
}

/**
 * Authentication API endpoints
 */
export const authApi = {
  async register(data: { name: string; email: string; password: string }): Promise<{ user: User }> {
    const result = await apiRequest<{ user: User; message: string; token?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setInMemoryToken(result.token ?? null);
    return result;
  },

  async login(data: { email: string; password: string }): Promise<{ user: User }> {
    const result = await apiRequest<{ user: User; message: string; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setInMemoryToken(result.token ?? null);
    return result;
  },

  async getMe(): Promise<{ user: User }> {
    return apiRequest<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    const result = await apiRequest<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    });
    setInMemoryToken(null);
    return result;
  },
};

/**
 * Document Management API endpoints
 */
export const documentsApi = {
  async upload(file: File, name?: string): Promise<{ document: ApiDocument; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (name && name.trim()) {
      formData.append('name', name.trim());
    }

    return apiRequest<{ document: ApiDocument; message: string }>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getAll(): Promise<{ documents: ApiDocument[] }> {
    return apiRequest<{ documents: ApiDocument[] }>('/api/documents', {
      method: 'GET',
    });
  },

  async getById(id: string): Promise<{ document: ApiDocument }> {
    return apiRequest<{ document: ApiDocument }>(`/api/documents/${id}`, {
      method: 'GET',
    });
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async retry(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/documents/${id}/retry`, {
      method: 'POST',
    });
  },
};
