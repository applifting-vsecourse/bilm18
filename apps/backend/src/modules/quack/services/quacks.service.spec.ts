// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack, QuackPoll } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  poll: null,
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
    expect(repository.getQuacks).toHaveBeenCalledWith('u2');
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
