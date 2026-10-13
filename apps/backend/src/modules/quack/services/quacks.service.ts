import { Quack, QuackMood, QuackPoll } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

export const NO_POLL_MESSAGE = 'This quack has no poll';
export const WRONG_OPTION_MESSAGE = 'That option is not part of this poll';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  // The viewer decides which poll vote comes back as "mine".
  async getQuacks(user: Identity): Promise<Quack[]> {
    return this.quackRepository.getQuacks(user.id);
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: QuackMood; pollOptions?: string[] },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      pollOptions: quackData.pollOptions,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }

  // Casts or moves the user's vote and returns the poll as they now see it.
  async vote(
    user: Identity,
    quackId: string,
    optionId: string,
  ): Promise<QuackPoll> {
    const poll = await this.quackRepository.getPoll(quackId, user.id);
    if (!poll) throw new NotFoundException(NO_POLL_MESSAGE);

    // The database would reject it too (composite foreign key); checking
    // here turns that into a clear 400 instead of a 500.
    if (!poll.options.some((option) => option.id === optionId)) {
      throw new BadRequestException(WRONG_OPTION_MESSAGE);
    }

    // Same option again: nothing to write, and updatedAt keeps meaning
    // "when the vote last changed".
    if (poll.myVoteOptionId === optionId) return poll;

    await this.quackRepository.saveVote({
      quackId,
      optionId,
      // the voter is taken from the session, never from the request body
      userId: user.id,
    });

    const updated = await this.quackRepository.getPoll(quackId, user.id);
    // Options are never deleted, so the poll can't vanish in between.
    if (!updated) throw new NotFoundException(NO_POLL_MESSAGE);
    return updated;
  }
}
