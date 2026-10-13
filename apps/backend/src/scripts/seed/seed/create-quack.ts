import { PrismaService } from '@/core/prisma/prisma.service';
import { Quack, QuackMood } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  mood?: QuackMood;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
  // Turns the quack into a poll; stored in the given order.
  pollOptions?: string[];
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, mood, userId, createdAt, pollOptions } = params;

  return await prisma.quack.create({
    data: {
      text,
      mood,
      createdAt,
      user: {
        connect: {
          id: userId,
        },
      },
      pollOptions: pollOptions
        ? {
            create: pollOptions.map((optionText, position) => ({
              text: optionText,
              position,
            })),
          }
        : undefined,
    },
  });
}
