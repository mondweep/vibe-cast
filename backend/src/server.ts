import { join } from 'node:path';
import { createApp } from './app';
import { FirestoreNightRepository, FirestoreJournalRepository } from './firestore-repositories';
import { firebaseTokenVerifier } from './firebase-auth';

const port = Number(process.env.PORT ?? 8080);
const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? 'vibe-cast-projects';

const app = createApp({
  nights: new FirestoreNightRepository(projectId),
  journal: new FirestoreJournalRepository(projectId),
  verifyToken: firebaseTokenVerifier(projectId),
  staticDir: join(__dirname, '..', 'public'),
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`somnus api listening on ${port}`);
});
