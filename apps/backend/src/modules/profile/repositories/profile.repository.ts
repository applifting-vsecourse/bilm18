import { PrismaService } from '@/core/prisma/prisma.service';
import { User as PrismaUser } from '@/generated/prisma/client';
import { Profile } from '@/modules/profile/domain/profile';
import { Injectable } from '@nestjs/common';

const mapPrismaUserToProfile = (user: PrismaUser): Profile => ({
  username: user.username ?? '',
  name: user.name,
  bio: user.bio,
  defaultMood: user.defaultMood,
});

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<Profile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return mapPrismaUserToProfile(user);
  }

  // Case-insensitive, so "breadcritic" can't sit next to "BreadCritic".
  async isUsernameTakenByAnotherUser(
    username: string,
    userId: string,
  ): Promise<boolean> {
    const owner = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        id: { not: userId },
      },
      select: { id: true },
    });
    return owner !== null;
  }

  async updateProfile(userId: string, profile: Profile): Promise<Profile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: profile.username,
        // BetterAuth's username plugin reads this one for display.
        displayUsername: profile.username,
        name: profile.name,
        bio: profile.bio,
        defaultMood: profile.defaultMood,
      },
    });
    return mapPrismaUserToProfile(user);
  }
}
