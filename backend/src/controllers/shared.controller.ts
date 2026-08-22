import type { Request, Response } from 'express';
import { getPublicSharedDocument } from '../services/document.service.js';

/**
 * Handle unauthenticated public access to a shared document: GET /api/shared/:token
 */
export async function getPublicDocument(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    res.status(404).json({
      success: false,
      error: {
        message: 'This shared document is no longer available or the link has expired.',
        statusCode: 404,
      },
    });
    return;
  }

  try {
    const document = await getPublicSharedDocument(token);

    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          message: 'This shared document is no longer available or the link has expired.',
          statusCode: 404,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('[Shared Controller Error] Failed to retrieve public shared document:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve shared document.',
        statusCode: 500,
      },
    });
  }
}
