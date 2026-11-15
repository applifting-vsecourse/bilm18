import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  Quack,
  QuackMood,
  QuackPoll,
  QuackScope,
} from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

type QuackInclude = {
  user: true;
  pollOptions: {
    orderBy: { position: 'asc' };
    include: { _count: { select: { votes: true } } };
  };
  pollVotes: { where: { userId: string }; select: { optionId: true } };
  parent: {
    select: {
      id: true;
      deletedAt: true;
      user: { select: { username: true } };
    };
  };
  _count: { select: { threadReplies: { where: { deletedAt: null } } } };
};

// Loads what a list shows for a quack, as seen by `viewerId`: the author,
// the poll options with their vote counts, only the viewer's own vote, who
// a reply answers, and how many live replies a thread has.
const quackInclude = (viewerId: string): QuackInclude => ({
  user: true,
  pollOptions: {
    orderBy: { position: 'asc' },
    include: { _count: { select: { votes: true } } },
  },
  pollVotes: {
    where: { userId: viewerId },
    select: { optionId: true },
  },
  parent: {
    select: { id: true, deletedAt: true, user: { select: { username: true } } },
  },
  _count: { select: { threadReplies: { where: { deletedAt: null } } } },
});

type PrismaQuack = Prisma.QuackGetPayload<{ include: QuackInclude }>;

// Each list asks for one slice of the table — the feed must never show
// replies, so the filter lives here and nowhere else.
const scopeWhere = (
  scope: QuackScope,
  viewerId: string,
): Prisma.QuackWhereInput =>
  scope === 'mine'
    ? // A tombstone has no author, so this leaves tombstones out on its own.
      { userId: viewerId }
    : { parentId: null };

const mapPrismaPollToDomain = (quack: PrismaQuack): QuackPoll | null => {
  if (quack.pollOptions.length === 0) return null;

  const options = quack.pollOptions.map((option) => ({
    id: option.id,
    text: option.text,
    votes: option._count.votes,
  }));

  return {
    options,
    totalVotes: options.reduce((sum, option) => sum + option.votes, 0),
    // At most one row: the database allows one vote per person per poll.
    myVoteOptionId: quack.pollVotes[0]?.optionId ?? null,
  };
};

const mapPrismaQuackToDomain = (quack: PrismaQuack): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  deletedAt: quack.deletedAt,
  parentId: quack.parentId,
  rootId: quack.rootId,
  // null on a tombstone: it keeps no trace of its author.
  user: quack.user
    ? {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username ?? '',
      }
    : null,
  poll: mapPrismaPollToDomain(quack),
  replyCount: quack._count.threadReplies,
  parent: quack.parent
    ? {
        id: quack.parent.id,
        username: quack.parent.deletedAt
          ? null
          : (quack.parent.user?.username ?? ''),
      }
    : null,
});

// Rows read with FOR UPDATE — Prisma's query API can't take a row lock.
type LockedQuack = {
  id: string;
  userId: string | null;
  parentId: string | null;
  rootId: string | null;
  deletedAt: Date | null;
};

type Transaction = Prisma.TransactionClient;

// Locks the quack's row until the transaction ends. Replying and deleting
// both take this lock on the quack they change the thread under, so a reply
// can't land under a quack that is turning into a tombstone or going away.
const lockQuack = async (
  tx: Transaction,
  quackId: string,
): Promise<LockedQuack | undefined> => {
  const rows = await tx.$queryRaw<LockedQuack[]>`
    SELECT "id", "userId", "parentId", "rootId", "deletedAt"
    FROM "quack"
    WHERE "id" = ${quackId}
    FOR UPDATE`;
  return rows[0];
};

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(
    viewerId: string,
    scope: QuackScope = 'all',
  ): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      where: scopeWhere(scope, viewerId),
      include: quackInclude(viewerId),
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  // The whole thread `quackId` belongs to — its top-level quack and every
  // reply, tombstones included — oldest first. `quackId` may be any quack in
  // the thread. null when it doesn't exist.
  async getThread(quackId: string, viewerId: string): Promise<Quack[] | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { id: true, rootId: true },
    });
    if (!quack) return null;

    const rootId = quack.rootId ?? quack.id;
    const thread = await this.prisma.quack.findMany({
      where: { OR: [{ id: rootId }, { rootId }] },
      include: quackInclude(viewerId),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    // Deleted in between, e.g. the last reply under a tombstone.
    return thread.length > 0 ? thread.map(mapPrismaQuackToDomain) : null;
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: QuackMood;
    pollOptions?: string[];
    userId: string;
  }): Promise<Quack> {
    const { pollOptions } = createQuackData;
    // One nested write: the quack and its options are created together or
    // not at all.
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        pollOptions: pollOptions
          ? {
              create: pollOptions.map((text, position) => ({ text, position })),
            }
          : undefined,
      },
      include: quackInclude(createQuackData.userId),
    });
    return mapPrismaQuackToDomain(quack);
  }

  // Replies to `parentId` as `userId`. null when the parent doesn't exist or
  // is a tombstone — nobody can reply to a deleted quack.
  async createReply(reply: {
    parentId: string;
    text: string;
    mood?: QuackMood;
    userId: string;
  }): Promise<Quack | null> {
    return this.prisma.$transaction(async (tx) => {
      const parent = await lockQuack(tx, reply.parentId);
      if (!parent || parent.deletedAt !== null) return null;

      const created = await tx.quack.create({
        data: {
          text: reply.text,
          mood: reply.mood,
          user: { connect: { id: reply.userId } },
          parent: { connect: { id: parent.id } },
          // Written once: a reply never moves to another thread.
          root: { connect: { id: parent.rootId ?? parent.id } },
        },
        include: quackInclude(reply.userId),
      });
      return mapPrismaQuackToDomain(created);
    });
  }

  // null when the quack doesn't exist — or is a tombstone, which has no
  // author and so can't be deleted by anyone.
  async getAuthorId(quackId: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  // null when the quack doesn't exist or has no poll.
  async getPoll(quackId: string, viewerId: string): Promise<QuackPoll | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      include: quackInclude(viewerId),
    });
    return quack ? mapPrismaPollToDomain(quack) : null;
  }

  // Deletes the quack `userId` wrote. Who may delete it is decided by the
  // service before calling this — `userId` is the author, not the caller.
  // False when nothing matched, e.g. it was deleted in the meantime.
  //
  // docs/adr/0001: a quack with replies becomes a tombstone so the replies
  // keep their place; one without is deleted outright. Either way its poll
  // and votes go. Tombstones left without replies are then removed, up the
  // thread.
  async deleteQuack(quack: {
    quackId: string;
    userId: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await lockQuack(tx, quack.quackId);
      // Gone, already a tombstone (no author), or not by the author the
      // service checked.
      if (!locked || locked.userId !== quack.userId) return false;

      const replies = await tx.quack.count({ where: { parentId: locked.id } });
      if (replies > 0) {
        // Votes go with the options (onDelete: Cascade).
        await tx.pollOption.deleteMany({ where: { quackId: locked.id } });
        await tx.quack.update({
          where: { id: locked.id },
          data: { text: null, mood: null, userId: null, deletedAt: new Date() },
        });
        return true;
      }

      await tx.quack.delete({ where: { id: locked.id } });
      await removeEmptyTombstones(tx, locked.parentId);
      return true;
    });
  }

  // First vote and a changed vote are the same write. Keyed on the
  // (quackId, userId) unique index, so concurrent requests can't add a
  // second vote.
  async saveVote(vote: {
    quackId: string;
    optionId: string;
    userId: string;
  }): Promise<void> {
    const upsert = (): Promise<unknown> =>
      this.prisma.pollVote.upsert({
        where: {
          quackId_userId: { quackId: vote.quackId, userId: vote.userId },
        },
        create: vote,
        update: { optionId: vote.optionId },
      });

    try {
      await upsert();
    } catch (error) {
      // Two first votes raced and the other one inserted first — now it's
      // an update.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await upsert();
        return;
      }
      throw error;
    }
  }
}

// Walks up from `parentId` and deletes each tombstone that has no replies
// left, stopping at the first live quack or the first tombstone that still
// has some. Keeps every tombstone with a live reply somewhere below it.
async function removeEmptyTombstones(
  tx: Transaction,
  parentId: string | null,
): Promise<void> {
  let nextId = parentId;
  while (nextId) {
    const parent = await lockQuack(tx, nextId);
    if (!parent || parent.deletedAt === null) return;

    const replies = await tx.quack.count({ where: { parentId: parent.id } });
    if (replies > 0) return;

    await tx.quack.delete({ where: { id: parent.id } });
    nextId = parent.parentId;
  }
}
