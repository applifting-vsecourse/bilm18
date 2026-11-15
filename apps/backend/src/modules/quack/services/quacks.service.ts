import { UserRole } from '@/generated/prisma/client';
import {
  Quack,
  QuackMood,
  QuackPoll,
  QuackScope,
} from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

export const NO_POLL_MESSAGE = 'This quack has no poll';
export const WRONG_OPTION_MESSAGE = 'That option is not part of this poll';
export const QUACK_NOT_FOUND_MESSAGE = 'Quack not found';
export const NOT_YOUR_QUACK_MESSAGE = 'You can only delete your own quacks';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  // The viewer decides which poll vote comes back as "mine" — and, for the
  // "mine" scope, whose quacks these are. Never an id from the request.
  async getQuacks(user: Identity, scope: QuackScope = 'all'): Promise<Quack[]> {
    return this.quackRepository.getQuacks(user.id, scope);
  }

  // `quackId` may be the top-level quack or any reply in the thread.
  async getThread(user: Identity, quackId: string): Promise<Quack[]> {
    const thread = await this.quackRepository.getThread(quackId, user.id);
    if (!thread) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);
    return thread;
  }

  // Anyone signed in may reply to a live quack. A deleted one answers 404,
  // like one that never existed. A reply has no poll — CreateReplyDto has
  // no field for one.
  async createReply(
    user: Identity,
    parentId: string,
    replyData: { text: string; mood?: QuackMood },
  ): Promise<Quack> {
    const reply = await this.quackRepository.createReply({
      parentId,
      text: replyData.text,
      mood: replyData.mood,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
    if (!reply) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);
    return reply;
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

  // The author may delete their own quack; an admin may delete anyone's.
  // This is the only permission check — the repository deletes what it's told.
  // A quack with replies stays as a tombstone (docs/adr/0001) — the
  // repository decides which; the rule for who may delete is the same.
  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const authorId = await this.quackRepository.getAuthorId(quackId);
    // Also a tombstone: it has no author, and is already deleted.
    if (!authorId) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);

    // who is asking, and their role, come from the session, never from the request
    const isOwner = authorId === user.id;
    const isAdmin = user.role === UserRole.admin;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(NOT_YOUR_QUACK_MESSAGE);
    }

    const deleted = await this.quackRepository.deleteQuack({
      quackId,
      userId: authorId,
    });
    // Deleted in between, e.g. from another tab.
    if (!deleted) throw new NotFoundException(QUACK_NOT_FOUND_MESSAGE);
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
