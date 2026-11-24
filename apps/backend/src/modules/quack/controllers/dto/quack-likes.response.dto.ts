import { QuackLikes } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

// A quack's likes as the signed-in user sees them, after a like or unlike.
export class QuackLikesDto {
  @ApiProperty({ description: 'How many people like this quack' })
  likeCount!: number;

  @ApiProperty({ description: 'Whether the signed-in user likes it' })
  likedByMe!: boolean;

  static fromDomain(likes: QuackLikes): QuackLikesDto {
    return { likeCount: likes.likeCount, likedByMe: likes.likedByMe };
  }
}
