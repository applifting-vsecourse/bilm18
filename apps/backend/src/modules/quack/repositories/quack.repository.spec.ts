// Prisma is mocked: these tests cover how rows become a poll, not the SQL.
// The database rules (one vote per person, option from the same poll) are
// constraints in the migration.
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { QuackRepository } from './quack.repository';

const caffeinatedDuck = {
  id: 'u1',
  name: 'Caffeinated Duck',
  username: 'CaffeinatedDuck',
};

const aRow = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: 'q1',
  text: 'Where do we go for lunch?',
  mood: null,
  userId: caffeinatedDuck.id,
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: caffeinatedDuck,
  pollOptions: [],
  pollVotes: [],
  ...overrides,
});

const lunchOptions = [
  { id: 'o1', text: 'Pizza', position: 0, _count: { votes: 3 } },
  { id: 'o2', text: 'Sushi', position: 1, _count: { votes: 1 } },
  { id: 'o3', text: 'Canteen', position: 2, _count: { votes: 0 } },
];

const setup = (
  rows: unknown[],
): { prisma: DeepMockProxy<PrismaService>; repository: QuackRepository } => {
  const prisma = mockDeep<PrismaService>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma.quack.findMany.mockResolvedValue(rows as any);
  return { prisma, repository: new QuackRepository(prisma) };
};

describe('QuackRepository.getQuacks', () => {
  it('returns no poll for a quack without options', async () => {
    const { repository } = setup([aRow()]);

    const [quack] = await repository.getQuacks('u2');

    expect(quack.poll).toBeNull();
  });

  it('turns options into vote counts and a total', async () => {
    const { repository } = setup([aRow({ pollOptions: lunchOptions })]);

    const [quack] = await repository.getQuacks('u1');

    expect(quack.poll).toEqual({
      options: [
        { id: 'o1', text: 'Pizza', votes: 3 },
        { id: 'o2', text: 'Sushi', votes: 1 },
        { id: 'o3', text: 'Canteen', votes: 0 },
      ],
      totalVotes: 4,
      myVoteOptionId: null,
    });
  });

  it("marks the viewer's own vote", async () => {
    const { repository } = setup([
      aRow({ pollOptions: lunchOptions, pollVotes: [{ optionId: 'o2' }] }),
    ]);

    const [quack] = await repository.getQuacks('u5');

    expect(quack.poll?.myVoteOptionId).toBe('o2');
  });

  it("reads only the viewer's vote, never anyone else's", async () => {
    const { prisma, repository } = setup([]);

    await repository.getQuacks('u5');

    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          pollVotes: {
            where: { userId: 'u5' },
            select: { optionId: true },
          },
        }) as unknown,
      }),
    );
  });

  it('keeps the options in the order they were written', async () => {
    const { prisma, repository } = setup([]);

    await repository.getQuacks('u1');

    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          pollOptions: expect.objectContaining({
            orderBy: { position: 'asc' },
          }) as unknown,
        }) as unknown,
      }),
    );
  });
});

describe('QuackRepository.saveVote', () => {
  const vote = { quackId: 'q1', optionId: 'o2', userId: 'u4' };

  it('upserts on the one-vote-per-person key', async () => {
    const { prisma, repository } = setup([]);

    await repository.saveVote(vote);

    expect(prisma.pollVote.upsert).toHaveBeenCalledWith({
      where: { quackId_userId: { quackId: 'q1', userId: 'u4' } },
      create: vote,
      update: { optionId: 'o2' },
    });
  });

  it('retries once when a concurrent first vote won the insert', async () => {
    const { prisma, repository } = setup([]);
    prisma.pollVote.upsert
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({} as any);

    await expect(repository.saveVote(vote)).resolves.toBeUndefined();
    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(2);
  });

  it('passes other database errors on', async () => {
    const { prisma, repository } = setup([]);
    prisma.pollVote.upsert.mockRejectedValueOnce(new Error('connection lost'));

    await expect(repository.saveVote(vote)).rejects.toThrow('connection lost');
    expect(prisma.pollVote.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('QuackRepository.createQuack', () => {
  const created = (): Record<string, unknown> =>
    aRow({
      pollOptions: [
        { id: 'o1', text: 'Pizza', position: 0, _count: { votes: 0 } },
        { id: 'o2', text: 'Sushi', position: 1, _count: { votes: 0 } },
      ],
    });

  it('creates the quack and its options in one write, keeping their order', async () => {
    const { prisma, repository } = setup([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.quack.create.mockResolvedValue(created() as any);

    const quack = await repository.createQuack({
      text: 'Where do we go for lunch?',
      pollOptions: ['Pizza', 'Sushi'],
      userId: 'u1',
    });

    expect(prisma.quack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pollOptions: {
            create: [
              { text: 'Pizza', position: 0 },
              { text: 'Sushi', position: 1 },
            ],
          },
        }) as unknown,
      }),
    );
    expect(quack.poll).toEqual({
      options: [
        { id: 'o1', text: 'Pizza', votes: 0 },
        { id: 'o2', text: 'Sushi', votes: 0 },
      ],
      totalVotes: 0,
      myVoteOptionId: null,
    });
  });

  it('creates no options for a plain quack', async () => {
    const { prisma, repository } = setup([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.quack.create.mockResolvedValue(aRow() as any);

    const quack = await repository.createQuack({
      text: 'third espresso',
      userId: 'u1',
    });

    expect(prisma.quack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pollOptions: undefined }) as unknown,
      }),
    );
    expect(quack.poll).toBeNull();
  });
});

describe('QuackRepository.deleteQuack', () => {
  it('deletes only when the given user wrote the quack', async () => {
    const { prisma, repository } = setup([]);
    prisma.quack.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.deleteQuack({ quackId: 'q1', userId: 'u1' }),
    ).resolves.toBe(true);
    expect(prisma.quack.deleteMany).toHaveBeenCalledWith({
      where: { id: 'q1', userId: 'u1' },
    });
  });

  it("reports false when nothing matched, e.g. someone else's quack", async () => {
    const { prisma, repository } = setup([]);
    prisma.quack.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.deleteQuack({ quackId: 'q1', userId: 'u3' }),
    ).resolves.toBe(false);
  });
});
