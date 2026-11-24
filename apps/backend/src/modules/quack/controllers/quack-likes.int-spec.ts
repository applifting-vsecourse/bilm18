// Likes against the real app and database (cases.md, B: API behaviour I1–I15).
// Every test starts from an empty database and creates what it needs.
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  createTestApp,
  resetDatabase,
  signedInAdmin,
  signedInAgent,
  users,
} from '@/test/int/test-app';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

type Agent = ReturnType<typeof request.agent>;
type ApiQuack = { id: string; likeCount: number; likedByMe: boolean };

describe('Likes API', () => {
  let app: INestApplication;
  let caffeinatedDuck: Agent;
  let breadCritic: Agent;
  let deepDuckThoughts: Agent;
  let superadmin: Agent;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    caffeinatedDuck = await signedInAgent(app, users.caffeinatedDuck);
    breadCritic = await signedInAgent(app, users.breadCritic);
    deepDuckThoughts = await signedInAgent(app, users.deepDuckThoughts);
    superadmin = await signedInAdmin(app, users.superadmin);
  });

  afterAll(async () => {
    await app.close();
  });

  const postQuack = async (author: Agent, text: string): Promise<string> => {
    const response = await author.post('/api/quacks').send({ text });
    expect(response.status).toBe(201);
    return (response.body as { id: string }).id;
  };

  const postReply = async (
    author: Agent,
    quackId: string,
    text: string,
  ): Promise<string> => {
    const response = await author
      .post(`/api/quacks/${quackId}/replies`)
      .send({ text });
    expect(response.status).toBe(201);
    return (response.body as { id: string }).id;
  };

  const like = (agent: Agent, quackId: string): request.Test =>
    agent.put(`/api/quacks/${quackId}/like`);
  const unlike = (agent: Agent, quackId: string): request.Test =>
    agent.delete(`/api/quacks/${quackId}/like`);

  // The quack as `viewer` sees it in a list (the feed by default).
  const inList = async (
    viewer: Agent,
    quackId: string,
    scope: 'all' | 'mine' = 'all',
  ): Promise<ApiQuack | undefined> => {
    const response = await viewer.get('/api/quacks').query({ scope });
    expect(response.status).toBe(200);
    return (response.body as ApiQuack[]).find((q) => q.id === quackId);
  };

  const inThread = async (
    viewer: Agent,
    rootId: string,
    quackId: string,
  ): Promise<ApiQuack | undefined> => {
    const response = await viewer.get(`/api/quacks/${rootId}/thread`);
    expect(response.status).toBe(200);
    return (response.body as ApiQuack[]).find((q) => q.id === quackId);
  };

  const likesInDatabase = (quackId: string): Promise<number> =>
    app.get(PrismaService).quackLike.count({ where: { quackId } });

  const coffee = 'just spilled coffee on my keyboard';

  it('I1: a signed-out visitor can neither like nor unlike', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    const visitor = request(app.getHttpServer());

    await visitor.put(`/api/quacks/${quackId}/like`).expect(401);
    await visitor.delete(`/api/quacks/${quackId}/like`).expect(401);

    expect(await inList(caffeinatedDuck, quackId)).toMatchObject({
      likeCount: 0,
    });
  });

  it('I2: the first like', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);

    const response = await like(breadCritic, quackId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ likeCount: 1, likedByMe: true });
  });

  it('I3: the feed shows the like, and each viewer sees whether it is theirs', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    await like(breadCritic, quackId).expect(200);

    expect(await inList(breadCritic, quackId)).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
    expect(await inList(deepDuckThoughts, quackId)).toMatchObject({
      likeCount: 1,
      likedByMe: false,
    });
  });

  it('I4: liking again changes nothing', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    await like(breadCritic, quackId).expect(200);

    const response = await like(breadCritic, quackId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ likeCount: 1, likedByMe: true });
  });

  it('I5: five likes at once from the same person count once', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => like(breadCritic, quackId)),
    );

    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(await inList(breadCritic, quackId)).toMatchObject({
      likeCount: 1,
    });
    expect(await likesInDatabase(quackId)).toBe(1);
  });

  it('I6: likes from different people add up', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);

    await like(breadCritic, quackId).expect(200);
    await like(deepDuckThoughts, quackId).expect(200);
    await like(superadmin, quackId).expect(200);

    expect(await inList(caffeinatedDuck, quackId)).toMatchObject({
      likeCount: 3,
    });
  });

  it('I7: unliking takes back only my like', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    await like(breadCritic, quackId).expect(200);
    await like(deepDuckThoughts, quackId).expect(200);

    const response = await unlike(breadCritic, quackId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ likeCount: 1, likedByMe: false });
    expect(await inList(deepDuckThoughts, quackId)).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
  });

  it('I8: unliking without a like changes nothing', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    await like(deepDuckThoughts, quackId).expect(200);

    const response = await unlike(breadCritic, quackId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ likeCount: 1, likedByMe: false });
  });

  it("I9: an admin can't take back someone else's like", async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    await like(breadCritic, quackId).expect(200);

    const response = await unlike(superadmin, quackId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ likeCount: 1, likedByMe: false });
    expect(await inList(breadCritic, quackId)).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
  });

  it('I10: the author can like their own quack', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);

    const response = await like(caffeinatedDuck, quackId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ likeCount: 1, likedByMe: true });
  });

  it('I11: a reply has its own likes; they do not count for the quack above', async () => {
    const rootId = await postQuack(caffeinatedDuck, coffee);
    const replyId = await postReply(breadCritic, rootId, 'Rice. Now.');

    await like(deepDuckThoughts, replyId).expect(200);

    expect(await inThread(deepDuckThoughts, rootId, replyId)).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
    expect(await inThread(deepDuckThoughts, rootId, rootId)).toMatchObject({
      likeCount: 0,
      likedByMe: false,
    });
  });

  it('I12: Mine shows the likes too', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    await like(breadCritic, quackId).expect(200);

    expect(await inList(caffeinatedDuck, quackId, 'mine')).toMatchObject({
      likeCount: 1,
      likedByMe: false,
    });
  });

  it('I13: a quack that does not exist answers 404', async () => {
    const liked = await like(breadCritic, 'does-not-exist');
    const unliked = await unlike(breadCritic, 'does-not-exist');

    expect(liked.status).toBe(404);
    expect(liked.body).toMatchObject({ message: 'Quack not found' });
    expect(unliked.status).toBe(404);
    expect(unliked.body).toMatchObject({ message: 'Quack not found' });
  });

  it('I14: a tombstone loses its likes and cannot be liked', async () => {
    const rootId = await postQuack(caffeinatedDuck, coffee);
    const replyId = await postReply(breadCritic, rootId, 'Rice. Now.');
    await like(breadCritic, rootId).expect(200);
    await like(deepDuckThoughts, rootId).expect(200);
    await like(deepDuckThoughts, replyId).expect(200);

    // It has a reply, so it becomes a tombstone (docs/adr/0001).
    await caffeinatedDuck.delete(`/api/quacks/${rootId}`).expect(204);

    expect(await inThread(breadCritic, rootId, rootId)).toMatchObject({
      likeCount: 0,
      likedByMe: false,
    });
    expect(await likesInDatabase(rootId)).toBe(0);
    expect(await inThread(deepDuckThoughts, rootId, replyId)).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
    expect((await like(breadCritic, rootId)).status).toBe(404);
    expect((await unlike(breadCritic, rootId)).status).toBe(404);
  });

  it('I15: a quack deleted outright leaves no likes behind', async () => {
    const quackId = await postQuack(caffeinatedDuck, coffee);
    await like(breadCritic, quackId).expect(200);

    await caffeinatedDuck.delete(`/api/quacks/${quackId}`).expect(204);

    expect(await likesInDatabase(quackId)).toBe(0);
    expect((await like(breadCritic, quackId)).status).toBe(404);
  });
});
