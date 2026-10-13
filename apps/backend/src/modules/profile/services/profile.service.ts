import { Prisma } from '@/generated/prisma/client';
import { Profile } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { ConflictException, Injectable } from '@nestjs/common';

export const USERNAME_TAKEN_MESSAGE = 'That username is already taken';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(user: Identity): Promise<Profile> {
    return this.profileRepository.getProfile(user.id);
  }

  async updateProfile(user: Identity, profile: Profile): Promise<Profile> {
    if (
      await this.profileRepository.isUsernameTakenByAnotherUser(
        profile.username,
        user.id,
      )
    ) {
      throw new ConflictException(USERNAME_TAKEN_MESSAGE);
    }

    try {
      return await this.profileRepository.updateProfile(user.id, profile);
    } catch (error) {
      // Someone grabbed the same name between the check and the write.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(USERNAME_TAKEN_MESSAGE);
      }
      throw error;
    }
  }
}
