import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { ApiResponse } from '../types/index';

export interface AuthRequest extends Request {
  uid?: string;
  email?: string;
}

export async function verifyFirebaseToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Missing or invalid authorization header',
      timestamp: new Date().toISOString(),
    };
    res.status(401).json(response);
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.uid = decodedToken.uid;
    req.email = decodedToken.email;
    next();
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString(),
    };
    res.status(401).json(response);
  }
}
