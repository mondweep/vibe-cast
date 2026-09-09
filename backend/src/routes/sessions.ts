import { Router, Response } from 'express';
import { firebaseService } from '../services/firestore';
import { AuthRequest, verifyFirebaseToken } from '../middleware/auth';
import { ApiResponse, LearnerSession } from '../types/index';

const router = Router();

router.post(
  '/sessions',
  verifyFirebaseToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.uid || !req.email) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'User ID or email not found',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const displayName = req.body.displayName || req.email.split('@')[0];
      const session = await firebaseService.createUserSession(
        req.uid,
        req.email,
        displayName
      );

      const response: ApiResponse<LearnerSession> = {
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating session:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to create session',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
);

router.get(
  '/sessions/:userId',
  verifyFirebaseToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (req.uid !== req.params.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
        };
        res.status(403).json(response);
        return;
      }

      const session = await firebaseService.getUserSession(req.params.userId);

      if (!session) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Session not found',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<LearnerSession> = {
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      console.error('Error retrieving session:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to retrieve session',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
);

router.put(
  '/sessions/:userId/progress',
  verifyFirebaseToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (req.uid !== req.params.userId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Unauthorized',
          timestamp: new Date().toISOString(),
        };
        res.status(403).json(response);
        return;
      }

      const { moduleId } = req.body;

      if (typeof moduleId !== 'number') {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid moduleId',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const session = await firebaseService.updateUserProgress(
        req.params.userId,
        moduleId
      );

      const response: ApiResponse<LearnerSession> = {
        success: true,
        data: session,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      console.error('Error updating progress:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to update progress',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
);

export default router;
