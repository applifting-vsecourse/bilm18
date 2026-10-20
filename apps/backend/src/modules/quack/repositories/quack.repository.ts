import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { Quack, QuackMood, QuackPoll } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

type QuackWithPollInclude = {
  user: true;
  pollOptions: {
    orderBy: { position: 'asc' };
    include: { _count: { select: { votes: true } } };
  };
  pollVotes: { where: { userId: string }; select: { optionId: true } };
};

// Loads what the feed shows for a quack, as seen by `viewerId`: the author,
// the poll options with their vote counts, and only the viewer's own vote.
const quackInclude = (viewerId: string): QuackWithPollInclude => ({
  user: true,
  pollOptions: {
    orderBy: { position: 'asc' },
    include: { _count: { select: { votes: true } } },
  },
  pollVotes: {
    where: { userId: viewerId },
    select: { optionId: true },
  },
});

type PrismaQuackWithPoll = Prisma.QuackGetPayload<{
  include: QuackWithPollInclude;
}>;

const mapPrismaPollToDomain = (
  quack: PrismaQuackWithPoll,
): QuackPoll | null => {
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

const mapPrismaQuackToDomain = (quack: PrismaQuackWithPoll): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: {
    id: quack.user.id,
    name: quack.user.name,
    username: quack.user.username ?? '',
  },
  poll: mapPrismaPollToDomain(quack),
});

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getQuacks(viewerId: string): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      include: quackInclude(viewerId),
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
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

  // null when the quack doesn't exist or has no poll.
  async getPoll(quackId: string, viewerId: string): Promise<QuackPoll | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      include: quackInclude(viewerId),
    });
    return quack ? mapPrismaPollToDomain(quack) : null;
  }

  // null when the quack doesn't exist.
  async getAuthorId(quackId: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id: quackId },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  // Deletes only if `userId` wrote it — the author check is part of the
  // write itself, so no other code path can delete someone else's quack.
  // Poll options and votes go with it (onDelete: Cascade). False when
  // nothing matched.
  async deleteQuack(quack: {
    quackId: string;
    userId: string;
  }): Promise<boolean> {
    const { count } = await this.prisma.quack.deleteMany({
      where: { id: quack.quackId, userId: quack.userId },
    });
    return count > 0;
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
