import { Prisma } from '@/generated/prisma/client';
import { Profile } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ConflictException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

const aProfile = (overrides: Partial<Profile> = {}): Profile => ({
  username: 'CaffeinatedDuck',
  name: 'Caffeinated Duck',
  bio: null,
  defaultMood: null,
  ...overrides,
});

const user = { id: 'u1' } as Identity;

describe('ProfileService', () => {
  it("returns the signed-in user's profile", async () => {
    const repository = mock<ProfileRepository>();
    repository.getProfile.mockResolvedValue(aProfile());

    const service = new ProfileService(repository);

    await expect(service.getProfile(user)).resolves.toEqual(aProfile());
    expect(repository.getProfile).toHaveBeenCalledWith('u1');
  });

  it('saves the profile when the username is free', async () => {
    const changes = aProfile({
      username: 'DecafDuck',
      bio: 'third espresso',
      defaultMood: 'silly',
    });
    const repository = mock<ProfileRepository>();
    repository.isUsernameTakenByAnotherUser.mockResolvedValue(false);
    repository.updateProfile.mockResolvedValue(changes);

    const service = new ProfileService(repository);

    await expect(service.updateProfile(user, changes)).resolves.toEqual(
      changes,
    );
    expect(repository.isUsernameTakenByAnotherUser).toHaveBeenCalledWith(
      'DecafDuck',
      'u1',
    );
    expect(repository.updateProfile).toHaveBeenCalledWith('u1', changes);
  });

  it('refuses a username someone else already has', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTakenByAnotherUser.mockResolvedValue(true);

    const service = new ProfileService(repository);

    await expect(
      service.updateProfile(user, aProfile({ username: 'BreadCritic' })),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it('reports a conflict when the name is taken between check and save', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTakenByAnotherUser.mockResolvedValue(false);
    repository.updateProfile.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const service = new ProfileService(repository);

    await expect(
      service.updateProfile(user, aProfile({ username: 'BreadCritic' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
