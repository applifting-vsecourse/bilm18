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
  deletedAt: null,
  parentId: null,
  rootId: null,
  user: caffeinatedDuck,
  pollOptions: [],
  pollVotes: [],
  parent: null,
  _count: { threadReplies: 0 },
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

describe('QuackRepository.getQuacks scope', () => {
  it('shows only top-level quacks in the feed', async () => {
    const { prisma, repository } = setup([]);

    await repository.getQuacks('u1', 'all');

    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: null } }),
    );
  });

  it('shows everything the viewer wrote under "mine", replies included', async () => {
    const { prisma, repository } = setup([]);

    await repository.getQuacks('u1', 'mine');

    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('counts only live replies in the thread', async () => {
    const { prisma, repository } = setup([
      aRow({ _count: { threadReplies: 3 } }),
    ]);

    const [quack] = await repository.getQuacks('u1');

    expect(quack.replyCount).toBe(3);
    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: {
            select: { threadReplies: { where: { deletedAt: null } } },
          },
        }) as unknown,
      }),
    );
  });

  it('names who a reply answers', async () => {
    const { repository } = setup([
      aRow({
        parentId: 'q-rice',
        rootId: 'q-coffee',
        parent: {
          id: 'q-rice',
          deletedAt: null,
          user: { username: 'BreadCritic' },
        },
      }),
    ]);

    const [quack] = await repository.getQuacks('u1', 'mine');

    expect(quack.parent).toEqual({ id: 'q-rice', username: 'BreadCritic' });
  });

  it('names no one when the quack replied to was deleted', async () => {
    const { repository } = setup([
      aRow({
        parentId: 'q-rice',
        rootId: 'q-coffee',
        parent: { id: 'q-rice', deletedAt: new Date(), user: null },
      }),
    ]);

    const [quack] = await repository.getQuacks('u1', 'mine');

    expect(quack.parent).toEqual({ id: 'q-rice', username: null });
  });

  it('maps a tombstone without author, text or poll', async () => {
    const deletedAt = new Date('2026-01-02T12:00:00Z');
    const { repository } = setup([
      aRow({ text: null, userId: null, user: null, deletedAt }),
    ]);

    const [quack] = await repository.getQuacks('u1');

    expect(quack).toMatchObject({
      text: null,
      userId: null,
      user: null,
      poll: null,
      deletedAt,
    });
  });
});

describe('QuackRepository.getThread', () => {
  it('loads the whole thread from any reply in it, oldest first', async () => {
    const { prisma, repository } = setup([aRow({ id: 'q-coffee' })]);
    prisma.quack.findUnique.mockResolvedValue({
      id: 'q-sourdough',
      rootId: 'q-coffee',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const thread = await repository.getThread('q-sourdough', 'u2');

    expect(thread).toHaveLength(1);
    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ id: 'q-coffee' }, { rootId: 'q-coffee' }] },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('starts from the quack itself when it is the top-level one', async () => {
    const { prisma, repository } = setup([aRow({ id: 'q-coffee' })]);
    prisma.quack.findUnique.mockResolvedValue({
      id: 'q-coffee',
      rootId: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await repository.getThread('q-coffee', 'u2');

    expect(prisma.quack.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ id: 'q-coffee' }, { rootId: 'q-coffee' }] },
      }),
    );
  });

  it('returns null for a quack that does not exist', async () => {
    const { prisma, repository } = setup([]);
    prisma.quack.findUnique.mockResolvedValue(null);

    await expect(repository.getThread('q-missing', 'u2')).resolves.toBeNull();
    expect(prisma.quack.findMany).not.toHaveBeenCalled();
  });
});

// What the FOR UPDATE lock reads, row by row.
type Locked = {
  id: string;
  userId: string | null;
  parentId: string | null;
  rootId: string | null;
  deletedAt: Date | null;
};
const live = (overrides: Partial<Locked> & { id: string }): Locked => ({
  userId: 'u1',
  parentId: null,
  rootId: null,
  deletedAt: null,
  ...overrides,
});
const tombstone = (overrides: Partial<Locked> & { id: string }): Locked =>
  live({ userId: null, deletedAt: new Date(), ...overrides });

// Runs the transaction callback against the same mock, and answers the row
// locks in the order they are taken.
const setupTransaction = (
  locks: (Locked | undefined)[],
): { prisma: DeepMockProxy<PrismaService>; repository: QuackRepository } => {
  const { prisma, repository } = setup([]);
  prisma.$transaction.mockImplementation(((
    fn: (tx: typeof prisma) => Promise<unknown>,
  ) => fn(prisma)) as never);
  for (const lock of locks) {
    prisma.$queryRaw.mockResolvedValueOnce(lock ? [lock] : []);
  }
  return { prisma, repository };
};

describe('QuackRepository.createReply', () => {
  const reply = {
    parentId: 'q-rice',
    text: 'it was a sourdough keyboard now',
    userId: 'u1',
  };

  it('puts a reply to a reply in the same thread', async () => {
    const { prisma, repository } = setupTransaction([
      live({ id: 'q-rice', parentId: 'q-coffee', rootId: 'q-coffee' }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.quack.create.mockResolvedValue(aRow() as any);

    await repository.createReply(reply);

    expect(prisma.quack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parent: { connect: { id: 'q-rice' } },
          root: { connect: { id: 'q-coffee' } },
          user: { connect: { id: 'u1' } },
        }) as unknown,
      }),
    );
  });

  it('makes a top-level quack the root of a reply to it', async () => {
    const { prisma, repository } = setupTransaction([live({ id: 'q-coffee' })]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.quack.create.mockResolvedValue(aRow() as any);

    await repository.createReply({ ...reply, parentId: 'q-coffee' });

    expect(prisma.quack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          root: { connect: { id: 'q-coffee' } },
        }) as unknown,
      }),
    );
  });

  it('refuses to reply to a tombstone', async () => {
    const { prisma, repository } = setupTransaction([
      tombstone({ id: 'q-rice', parentId: 'q-coffee', rootId: 'q-coffee' }),
    ]);

    await expect(repository.createReply(reply)).resolves.toBeNull();
    expect(prisma.quack.create).not.toHaveBeenCalled();
  });

  it('refuses to reply to a quack that does not exist', async () => {
    const { prisma, repository } = setupTransaction([undefined]);

    await expect(repository.createReply(reply)).resolves.toBeNull();
    expect(prisma.quack.create).not.toHaveBeenCalled();
  });
});

describe('QuackRepository.deleteQuack', () => {
  it('deletes a quack without replies outright', async () => {
    const { prisma, repository } = setupTransaction([
      live({ id: 'q-espresso' }),
    ]);
    prisma.quack.count.mockResolvedValue(0);

    await expect(
      repository.deleteQuack({ quackId: 'q-espresso', userId: 'u1' }),
    ).resolves.toBe(true);
    expect(prisma.quack.delete).toHaveBeenCalledWith({
      where: { id: 'q-espresso' },
    });
    expect(prisma.quack.update).not.toHaveBeenCalled();
  });

  it('turns a quack with replies into a tombstone and drops its poll', async () => {
    const { prisma, repository } = setupTransaction([live({ id: 'q-coffee' })]);
    prisma.quack.count.mockResolvedValue(2);

    await expect(
      repository.deleteQuack({ quackId: 'q-coffee', userId: 'u1' }),
    ).resolves.toBe(true);
    expect(prisma.pollOption.deleteMany).toHaveBeenCalledWith({
      where: { quackId: 'q-coffee' },
    });
    expect(prisma.quack.update).toHaveBeenCalledWith({
      where: { id: 'q-coffee' },
      data: {
        text: null,
        mood: null,
        userId: null,
        deletedAt: expect.any(Date) as unknown,
      },
    });
    expect(prisma.quack.delete).not.toHaveBeenCalled();
  });

  it('removes tombstones left without replies, up the thread', async () => {
    // coffee (tombstone) <- rice (tombstone) <- sourdough (deleted now)
    const { prisma, repository } = setupTransaction([
      live({ id: 'q-sourdough', parentId: 'q-rice', rootId: 'q-coffee' }),
      tombstone({ id: 'q-rice', parentId: 'q-coffee', rootId: 'q-coffee' }),
      tombstone({ id: 'q-coffee' }),
    ]);
    prisma.quack.count.mockResolvedValue(0);

    await repository.deleteQuack({ quackId: 'q-sourdough', userId: 'u1' });

    expect(prisma.quack.delete.mock.calls.map(([args]) => args)).toEqual([
      { where: { id: 'q-sourdough' } },
      { where: { id: 'q-rice' } },
      { where: { id: 'q-coffee' } },
    ]);
  });

  it('keeps a tombstone that still has another reply', async () => {
    const { prisma, repository } = setupTransaction([
      live({ id: 'q-sourdough', parentId: 'q-rice', rootId: 'q-coffee' }),
      tombstone({ id: 'q-rice', parentId: 'q-coffee', rootId: 'q-coffee' }),
    ]);
    prisma.quack.count
      .mockResolvedValueOnce(0) // sourdough has no replies
      .mockResolvedValueOnce(1); // rice still has one

    await repository.deleteQuack({ quackId: 'q-sourdough', userId: 'u1' });

    expect(prisma.quack.delete).toHaveBeenCalledTimes(1);
    expect(prisma.quack.delete).toHaveBeenCalledWith({
      where: { id: 'q-sourdough' },
    });
  });

  it('stops at a live quack above', async () => {
    const { prisma, repository } = setupTransaction([
      live({ id: 'q-rice', parentId: 'q-coffee', rootId: 'q-coffee' }),
      live({ id: 'q-coffee' }),
    ]);
    prisma.quack.count.mockResolvedValue(0);

    await repository.deleteQuack({ quackId: 'q-rice', userId: 'u1' });

    expect(prisma.quack.delete).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['does not exist', undefined],
    ['is already a tombstone', tombstone({ id: 'q-coffee' })],
    ['has another author', live({ id: 'q-coffee', userId: 'u3' })],
  ])('changes nothing when the quack %s', async (_, lock) => {
    const { prisma, repository } = setupTransaction([lock]);

    await expect(
      repository.deleteQuack({ quackId: 'q-coffee', userId: 'u1' }),
    ).resolves.toBe(false);
    expect(prisma.quack.delete).not.toHaveBeenCalled();
    expect(prisma.quack.update).not.toHaveBeenCalled();
  });
});
