import {
  createTestApp,
  resetDatabase,
  signedInAgent,
  users,
} from '@/test/int/test-app';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('GET /api/quacks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 to a signed-out visitor', async () => {
    await request(app.getHttpServer()).get('/api/quacks').expect(401);
  });

  it('returns 200 and the feed to a signed-in user', async () => {
    const duck = await signedInAgent(app, users.caffeinatedDuck);
    await duck
      .post('/api/quacks')
      .send({ text: 'Coffee first, quacks later.' })
      .expect(201);

    const response = await duck.get('/api/quacks').expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({ text: 'Coffee first, quacks later.' }),
    ]);
  });
});
