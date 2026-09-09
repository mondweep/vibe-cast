import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import sessionRoutes from './routes/sessions';
import { ApiResponse } from './types/index';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
) as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response): void => {
  const response: ApiResponse<{ status: string }> = {
    success: true,
    data: { status: 'healthy' },
    timestamp: new Date().toISOString(),
  };
  res.json(response);
});

app.use('/api', sessionRoutes);

app.use((_req: Request, res: Response): void => {
  const response: ApiResponse<null> = {
    success: false,
    error: 'Not found',
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(response);
});

app.listen(PORT, (): void => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
