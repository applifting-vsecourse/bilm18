// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack, QuackPoll } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  deletedAt: null,
  parentId: null,
  rootId: null,
  poll: null,
  replyCount: 0,
  parent: null,
  ...overrides,
});

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.getQuacks(user)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
  });

  it('loads quacks as seen by the signed-in user', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);

    await service.getQuacks({ id: 'u2' } as Identity);
    // the viewer decides which poll vote is "mine"
    expect(repository.getQuacks).toHaveBeenCalledWith('u2', 'all');
  });

  it('lists "mine" for the signed-in user, never for an id from the request', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    const service = new QuacksService(repository);

    await service.getQuacks({ id: 'u1' } as Identity, 'mine');
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', 'mine');
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      userId: 'u1',
    });
  });

  it('passes the chosen mood to the repository', async () => {
    const created = aQuack({ id: 'q3', text: 'third espresso', mood: 'silly' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'third espresso', mood: 'silly' }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'third espresso',
      mood: 'silly',
      userId: 'u1',
    });
  });
});

// "Where do we go for lunch?" from the seed, as Migration Season sees it.
const lunchPoll = (overrides: Partial<QuackPoll> = {}): QuackPoll => ({
  options: [
    { id: 'pizza', text: 'Pizza', votes: 3 },
    { id: 'sushi', text: 'Sushi', votes: 1 },
    { id: 'canteen', text: 'Canteen', votes: 0 },
  ],
  totalVotes: 4,
  myVoteOptionId: 'sushi',
  ...overrides,
});

describe('QuacksService.vote', () => {
  const migrationSeason = { id: 'u4' } as Identity;
  const caffeinatedDuck = { id: 'u1' } as Identity;

  it('casts a first vote as the signed-in user', async () => {
    const repository = mock<QuackRepository>();
    const after = lunchPoll({
      options: [
        { id: 'pizza', text: 'Pizza', votes: 4 },
        { id: 'sushi', text: 'Sushi', votes: 1 },
        { id: 'canteen', text: 'Canteen', votes: 0 },
      ],
      totalVotes: 5,
      myVoteOptionId: 'pizza',
    });
    repository.getPoll
      .mockResolvedValueOnce(lunchPoll({ myVoteOptionId: null }))
      .mockResolvedValueOnce(after);

    const service = new QuacksService(repository);

    await expect(
      service.vote(caffeinatedDuck, 'q-lunch', 'pizza'),
    ).resolves.toEqual(after);
    // the voter comes from the session, not from the caller's payload
    expect(repository.saveVote).toHaveBeenCalledWith({
      quackId: 'q-lunch',
      optionId: 'pizza',
      userId: 'u1',
    });
  });

  it('moves an existing vote to another option', async () => {
    const repository = mock<QuackRepository>();
    const after = lunchPoll({
      options: [
        { id: 'pizza', text: 'Pizza', votes: 3 },
        { id: 'sushi', text: 'Sushi', votes: 0 },
        { id: 'canteen', text: 'Canteen', votes: 1 },
      ],
      myVoteOptionId: 'canteen',
    });
    repository.getPoll
      .mockResolvedValueOnce(lunchPoll())
      .mockResolvedValueOnce(after);

    const service = new QuacksService(repository);

    await expect(
      service.vote(migrationSeason, 'q-lunch', 'canteen'),
    ).resolves.toEqual(after);
    expect(repository.saveVote).toHaveBeenCalledWith({
      quackId: 'q-lunch',
      optionId: 'canteen',
      userId: 'u4',
    });
  });

  it('writes nothing when voting for the same option again', async () => {
    const repository = mock<QuackRepository>();
    repository.getPoll.mockResolvedValue(lunchPoll());

    const service = new QuacksService(repository);

    await expect(
      service.vote(migrationSeason, 'q-lunch', 'sushi'),
    ).resolves.toEqual(lunchPoll());
    expect(repository.saveVote).not.toHaveBeenCalled();
  });

  it('rejects a quack without a poll, or one that does not exist', async () => {
    const repository = mock<QuackRepository>();
    repository.getPoll.mockResolvedValue(null);

    const service = new QuacksService(repository);

    await expect(
      service.vote(migrationSeason, 'q-espresso', 'pizza'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.saveVote).not.toHaveBeenCalled();
  });

  it('rejects an option from another poll', async () => {
    const repository = mock<QuackRepository>();
    repository.getPoll.mockResolvedValue(lunchPoll());

    const service = new QuacksService(repository);

    await expect(
      service.vote(migrationSeason, 'q-lunch', 'option-from-another-poll'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.saveVote).not.toHaveBeenCalled();
  });
});

describe('QuacksService.deleteQuack', () => {
  // Roles as in the seed: only superadmin is an admin, Pond Admin just has
  // the word in their name.
  const superadmin = { id: 'u0', role: 'admin' } as Identity;
  const caffeinatedDuck = { id: 'u1', role: 'user' } as Identity;
  const breadCritic = { id: 'u3', role: 'user' } as Identity;
  const pondAdmin = { id: 'u6', role: 'user' } as Identity;

  it("deletes the signed-in user's own quack", async () => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue('u1');
    repository.deleteQuack.mockResolvedValue(true);

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(caffeinatedDuck, 'q-espresso'),
    ).resolves.toBeUndefined();
    // the author comes from the session, not from the caller's payload
    expect(repository.deleteQuack).toHaveBeenCalledWith({
      quackId: 'q-espresso',
      userId: 'u1',
    });
  });

  it("refuses to delete someone else's quack", async () => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue('u1');

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(breadCritic, 'q-espresso'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.deleteQuack).not.toHaveBeenCalled();
  });

  it("lets an admin delete someone else's quack", async () => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue('u1');
    repository.deleteQuack.mockResolvedValue(true);

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(superadmin, 'q-espresso'),
    ).resolves.toBeUndefined();
    // the write targets the author's quack, not one by the admin
    expect(repository.deleteQuack).toHaveBeenCalledWith({
      quackId: 'q-espresso',
      userId: 'u1',
    });
  });

  it('goes by the role, not the name — Pond Admin is a regular user', async () => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue('u1');

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(pondAdmin, 'q-espresso'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.deleteQuack).not.toHaveBeenCalled();
  });

  it('rejects a quack that does not exist, for an admin too', async () => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue(null);

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(superadmin, 'q-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.deleteQuack).not.toHaveBeenCalled();
  });

  it('rejects a quack that does not exist', async () => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue(null);

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(caffeinatedDuck, 'q-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.deleteQuack).not.toHaveBeenCalled();
  });

  it('rejects a quack deleted in the meantime', async () => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue('u1');
    repository.deleteQuack.mockResolvedValue(false);

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(caffeinatedDuck, 'q-espresso'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('QuacksService.createQuack with a poll', () => {
  it('passes the poll options to the repository in order', async () => {
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(
      aQuack({ text: 'Where do we go for lunch?' }),
    );

    const service = new QuacksService(repository);

    await service.createQuack({ id: 'u1' } as Identity, {
      text: 'Where do we go for lunch?',
      pollOptions: ['Pizza', 'Sushi', 'Canteen'],
    });

    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'Where do we go for lunch?',
      pollOptions: ['Pizza', 'Sushi', 'Canteen'],
      userId: 'u1',
    });
  });
});

// The seed thread under Caffeinated Duck's "just spilled coffee".
const spilledCoffee = aQuack({
  id: 'q-coffee',
  text: 'just spilled coffee on my keyboard',
  replyCount: 3,
});
const riceWorks = aQuack({
  id: 'q-rice',
  text: 'Rice works. So does bread, allegedly.',
  userId: 'u3',
  user: { id: 'u3', name: 'The Bread Critic', username: 'BreadCritic' },
  parentId: 'q-coffee',
  rootId: 'q-coffee',
  parent: { id: 'q-coffee', username: 'CaffeinatedDuck' },
});

describe('QuacksService.getThread', () => {
  const deepDuckThoughts = { id: 'u2', role: 'user' } as Identity;

  it('returns the thread as the signed-in user sees it', async () => {
    const repository = mock<QuackRepository>();
    repository.getThread.mockResolvedValue([spilledCoffee, riceWorks]);

    const service = new QuacksService(repository);

    await expect(
      service.getThread(deepDuckThoughts, 'q-rice'),
    ).resolves.toEqual([spilledCoffee, riceWorks]);
    // the viewer decides which poll vote is "mine"
    expect(repository.getThread).toHaveBeenCalledWith('q-rice', 'u2');
  });

  it('rejects a quack that does not exist', async () => {
    const repository = mock<QuackRepository>();
    repository.getThread.mockResolvedValue(null);

    const service = new QuacksService(repository);

    await expect(
      service.getThread(deepDuckThoughts, 'q-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('QuacksService.createReply', () => {
  const superadmin = { id: 'u0', role: 'admin' } as Identity;
  const caffeinatedDuck = { id: 'u1', role: 'user' } as Identity;
  const breadCritic = { id: 'u3', role: 'user' } as Identity;

  it("replies to someone else's quack as the signed-in user", async () => {
    const repository = mock<QuackRepository>();
    repository.createReply.mockResolvedValue(riceWorks);

    const service = new QuacksService(repository);

    await expect(
      service.createReply(breadCritic, 'q-coffee', {
        text: 'Rice works. So does bread, allegedly.',
      }),
    ).resolves.toEqual(riceWorks);
    // the author comes from the session, not from the caller's payload
    expect(repository.createReply).toHaveBeenCalledWith({
      parentId: 'q-coffee',
      text: 'Rice works. So does bread, allegedly.',
      userId: 'u3',
    });
  });

  it('lets the author reply in their own thread, with a mood', async () => {
    const repository = mock<QuackRepository>();
    repository.createReply.mockResolvedValue(
      aQuack({ text: 'it was a sourdough keyboard now', mood: 'silly' }),
    );

    const service = new QuacksService(repository);

    await service.createReply(caffeinatedDuck, 'q-rice', {
      text: 'it was a sourdough keyboard now',
      mood: 'silly',
    });
    expect(repository.createReply).toHaveBeenCalledWith({
      parentId: 'q-rice',
      text: 'it was a sourdough keyboard now',
      mood: 'silly',
      userId: 'u1',
    });
  });

  it('lets an admin reply like anyone else', async () => {
    const repository = mock<QuackRepository>();
    repository.createReply.mockResolvedValue(aQuack());

    const service = new QuacksService(repository);

    await service.createReply(superadmin, 'q-coffee', { text: 'Noted.' });
    expect(repository.createReply).toHaveBeenCalledWith({
      parentId: 'q-coffee',
      text: 'Noted.',
      userId: 'u0',
    });
  });

  // The repository answers null for both: a missing quack, and a deleted one
  // (a tombstone) — nobody can reply to it, admins included.
  it.each([
    ['a regular user', breadCritic],
    ['an admin', superadmin],
  ])(
    'rejects a reply to a deleted or missing quack, for %s',
    async (_, user) => {
      const repository = mock<QuackRepository>();
      repository.createReply.mockResolvedValue(null);

      const service = new QuacksService(repository);

      await expect(
        service.createReply(user, 'q-deleted', { text: 'hello?' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );
});

describe('QuacksService.deleteQuack on a tombstone', () => {
  // A tombstone has no author, so getAuthorId finds none.
  it.each([
    ['its former author', { id: 'u3', role: 'user' } as Identity],
    ['an admin', { id: 'u0', role: 'admin' } as Identity],
  ])('answers 404 to %s', async (_, user) => {
    const repository = mock<QuackRepository>();
    repository.getAuthorId.mockResolvedValue(null);

    const service = new QuacksService(repository);

    await expect(
      service.deleteQuack(user, 'q-tombstone'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.deleteQuack).not.toHaveBeenCalled();
  });
});
