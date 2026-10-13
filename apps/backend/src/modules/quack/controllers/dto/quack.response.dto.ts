import {
  Quack,
  QUACK_MOODS,
  QuackMood,
  QuackPoll,
} from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class QuackPollOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'How many people picked this option' })
  votes!: number;
}

export class QuackPollDto {
  @ApiProperty({ type: [QuackPollOptionDto] })
  options!: QuackPollOptionDto[];

  @ApiProperty()
  totalVotes!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The signed-in user's vote; null if they haven't voted",
  })
  myVoteOptionId!: string | null;

  static fromDomain(poll: QuackPoll): QuackPollDto {
    return {
      options: poll.options.map(({ id, text, votes }) => ({ id, text, votes })),
      totalVotes: poll.totalVotes,
      myVoteOptionId: poll.myVoteOptionId,
    };
  }
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

  @ApiProperty({
    type: QuackPollDto,
    nullable: true,
    description: 'null for a quack without a poll',
  })
  poll!: QuackPollDto | null;

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    if (quack.poll === undefined) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.poll to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
      poll: quack.poll ? QuackPollDto.fromDomain(quack.poll) : null,
    };
  }
}
