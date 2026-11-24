// Likes (cases.md, A: rules R1–R6). The repository is mocked: these tests
// cover who likes what and when the service answers 404. One like per person
// and likes vanishing with a deleted quack are database rules — the
// integration tests (quack-likes.int-spec.ts) cover those.
import { UserRole } from '@/generated/prisma/client';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QUACK_NOT_FOUND_MESSAGE, QuacksService } from './quacks.service';

// Seed accounts (src/scripts/seed/seed/seed-database.ts).
const caffeinatedDuck = { id: 'u-duck', role: UserRole.user } as Identity;
const breadCritic = { id: 'u-bread', role: UserRole.user } as Identity;
const superadmin = { id: 'u-admin', role: UserRole.admin } as Identity;

// "just spilled coffee on my keyboard" by Caffeinated Duck.
const spilledCoffee = 'q-coffee';

function setup(): {
  repository: ReturnType<typeof mock<QuackRepository>>;
  service: QuacksService;
} {
  const repository = mock<QuackRepository>();
  const service = new QuacksService(repository);
  return { repository, service };
}

describe('QuacksService.likeQuack', () => {
  it('R1: likes a live quack as the signed-in user and returns its likes', async () => {
    const { repository, service } = setup();
    repository.saveLike.mockResolvedValue({ likeCount: 1, likedByMe: true });

    await expect(
      service.likeQuack(breadCritic, spilledCoffee),
    ).resolves.toEqual({ likeCount: 1, likedByMe: true });
    // the one who likes comes from the session, never from the request
    expect(repository.saveLike).toHaveBeenCalledWith({
      quackId: spilledCoffee,
      userId: breadCritic.id,
    });
  });

  it('R2: lets the author like their own quack', async () => {
    const { repository, service } = setup();
    repository.saveLike.mockResolvedValue({ likeCount: 1, likedByMe: true });

    await expect(
      service.likeQuack(caffeinatedDuck, spilledCoffee),
    ).resolves.toEqual({ likeCount: 1, likedByMe: true });
    expect(repository.saveLike).toHaveBeenCalledWith({
      quackId: spilledCoffee,
      userId: caffeinatedDuck.id,
    });
  });

  // R3 and R4: the repository finds no live quack — it never existed (R3),
  // or it is a tombstone (R4). Either way: 404, like a missing quack.
  it.each([
    ['R3: a quack that does not exist', 'does-not-exist'],
    ['R4: a tombstone', 'q-tombstone'],
  ])('%s answers 404', async (_case, quackId) => {
    const { repository, service } = setup();
    repository.saveLike.mockResolvedValue(null);

    await expect(service.likeQuack(breadCritic, quackId)).rejects.toThrow(
      new NotFoundException(QUACK_NOT_FOUND_MESSAGE),
    );
  });

  // R6: per role — an admin has no privilege, the like is theirs alone.
  it.each([
    ['a user', breadCritic],
    ['an admin', superadmin],
  ])('R6: %s likes the same way, once, as themselves', async (_role, user) => {
    const { repository, service } = setup();
    repository.saveLike.mockResolvedValue({ likeCount: 1, likedByMe: true });

    await service.likeQuack(user, spilledCoffee);

    expect(repository.saveLike).toHaveBeenCalledTimes(1);
    expect(repository.saveLike).toHaveBeenCalledWith({
      quackId: spilledCoffee,
      userId: user.id,
    });
  });
});

describe('QuacksService.unlikeQuack', () => {
  it("takes back the signed-in user's like and returns the quack's likes", async () => {
    const { repository, service } = setup();
    repository.removeLike.mockResolvedValue({ likeCount: 0, likedByMe: false });

    await expect(
      service.unlikeQuack(breadCritic, spilledCoffee),
    ).resolves.toEqual({ likeCount: 0, likedByMe: false });
    expect(repository.removeLike).toHaveBeenCalledWith({
      quackId: spilledCoffee,
      userId: breadCritic.id,
    });
  });

  it("R5: an admin's unlike takes back only the admin's own like", async () => {
    const { repository, service } = setup();
    // Bread Critic's like stays: the count is still 1.
    repository.removeLike.mockResolvedValue({ likeCount: 1, likedByMe: false });

    await expect(
      service.unlikeQuack(superadmin, spilledCoffee),
    ).resolves.toEqual({ likeCount: 1, likedByMe: false });
    expect(repository.removeLike).toHaveBeenCalledTimes(1);
    expect(repository.removeLike).toHaveBeenCalledWith({
      quackId: spilledCoffee,
      userId: superadmin.id,
    });
  });

  it.each([
    ['R3: a quack that does not exist', 'does-not-exist'],
    ['R4: a tombstone', 'q-tombstone'],
  ])('%s answers 404', async (_case, quackId) => {
    const { repository, service } = setup();
    repository.removeLike.mockResolvedValue(null);

    await expect(service.unlikeQuack(breadCritic, quackId)).rejects.toThrow(
      new NotFoundException(QUACK_NOT_FOUND_MESSAGE),
    );
  });
});
