export interface UpdateUserSettingsData {
  name?: string;
  preferences?: {
    defaultSummaryLength?: 'Short' | 'Medium' | 'Long';
    emailNotification?: boolean;
  };
}

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

export interface ApiNote {
  id: string;
  content: string;
  excerpt?: string;
  color: DocumentAccent;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocumentSharing {
  isPublic: boolean;
  shareToken?: string;
  sharedAt?: string;
}

export interface PublicSharedDocument {
  title: string;
  originalFileName: string;
  pages: number;
  words: string;
  date: string;
  status: DocumentStatus;
  summary: string;
  summaryVariants: DocumentSummaryVariants;
  keyPoints: string[];
  mainIdeas: { title: string; body: string }[];
  suggestions: string[];
  accent: DocumentAccent;
  sharedAt: string;
}

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
  notes?: ApiNote[];
  sharing?: ApiDocumentSharing;
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
 * Resolves the full target URL for an API endpoint.
 * In local dev (empty VITE_API_URL), uses relative /api to hit the Vite proxy.
 * In production (e.g. Vercel), prepends VITE_API_URL (e.g. https://unfold-backend.onrender.com).
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function getApiUrl(endpoint: string): string {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

/**
 * Base HTTP request wrapper with JSON serialization and credentials (cookies) included.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);

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

  async updateSettings(data: UpdateUserSettingsData): Promise<{ user: User; message: string }> {
    return apiRequest<{ user: User; message: string }>('/api/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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

  async ask(
    id: string,
    question: string
  ): Promise<{ success: boolean; answer: string; documentId: string; sources: string[] }> {
    return apiRequest<{ success: boolean; answer: string; documentId: string; sources: string[] }>(
      `/api/documents/${id}/ask`,
      {
        method: 'POST',
        body: JSON.stringify({ question }),
      }
    );
  },

  async getNotes(id: string): Promise<{ success: boolean; notes: ApiNote[] }> {
    return apiRequest<{ success: boolean; notes: ApiNote[] }>(`/api/documents/${id}/notes`, {
      method: 'GET',
    });
  },

  async addNote(
    id: string,
    data: { content: string; excerpt?: string; color?: DocumentAccent }
  ): Promise<{ success: boolean; note: ApiNote }> {
    return apiRequest<{ success: boolean; note: ApiNote }>(`/api/documents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateNote(
    id: string,
    noteId: string,
    data: { content?: string; excerpt?: string; color?: DocumentAccent }
  ): Promise<{ success: boolean; note: ApiNote }> {
    return apiRequest<{ success: boolean; note: ApiNote }>(`/api/documents/${id}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteNote(id: string, noteId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/documents/${id}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  async getShareStatus(id: string): Promise<{ success: boolean; sharing: ApiDocumentSharing }> {
    return apiRequest<{ success: boolean; sharing: ApiDocumentSharing }>(`/api/documents/${id}/share`, {
      method: 'GET',
    });
  },

  async enableShare(
    id: string
  ): Promise<{ success: boolean; sharing: ApiDocumentSharing; shareUrl: string }> {
    return apiRequest<{ success: boolean; sharing: ApiDocumentSharing; shareUrl: string }>(
      `/api/documents/${id}/share`,
      {
        method: 'POST',
      }
    );
  },

  async disableShare(
    id: string
  ): Promise<{ success: boolean; message: string; sharing: ApiDocumentSharing }> {
    return apiRequest<{ success: boolean; message: string; sharing: ApiDocumentSharing }>(
      `/api/documents/${id}/share`,
      {
        method: 'DELETE',
      }
    );
  },

  getExportUrl(id: string, format: 'markdown' | 'json' = 'markdown'): string {
    return getApiUrl(`/api/documents/${id}/export?format=${format}`);
  },
};

export const sharedApi = {
  async getByToken(token: string): Promise<{ success: boolean; document: PublicSharedDocument }> {
    return apiRequest<{ success: boolean; document: PublicSharedDocument }>(`/api/shared/${token}`, {
      method: 'GET',
    });
  },
};

export const userApi = {
  async getSettings(): Promise<{ user: User }> {
    return apiRequest<{ user: User }>('/api/user/settings', {
      method: 'GET',
    });
  },

  async updateSettings(data: UpdateUserSettingsData): Promise<{ user: User; message: string }> {
    return apiRequest<{ user: User; message: string }>('/api/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
