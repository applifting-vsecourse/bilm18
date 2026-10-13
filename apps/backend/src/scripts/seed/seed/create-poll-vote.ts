import { PrismaService } from '@/core/prisma/prisma.service';

type CreatePollVoteParams = {
  quackId: string;
  // The option is looked up by its text so the seed reads like the UI.
  optionText: string;
  userId: string;
};

export async function createPollVote(
  prisma: PrismaService,
  params: CreatePollVoteParams,
): Promise<void> {
  const { quackId, optionText, userId } = params;

  const option = await prisma.pollOption.findFirstOrThrow({
    where: { quackId, text: optionText },
  });

  await prisma.pollVote.create({
    data: { quackId, optionId: option.id, userId },
  });
}
