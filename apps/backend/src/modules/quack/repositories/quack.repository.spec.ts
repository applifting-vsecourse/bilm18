// Prisma is mocked: these tests cover how rows become a poll, not the SQL.
// The database rules (one vote per person, option from the same poll) are
// constraints in the migration.
import { PrismaService } from '@/core/prisma/prisma.service';
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
