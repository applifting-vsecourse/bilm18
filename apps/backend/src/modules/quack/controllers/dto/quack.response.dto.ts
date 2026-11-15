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

class QuackParentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null when the quack replied to has been deleted',
  })
  username!: string | null;
}

// A live quack, or a tombstone — a quack deleted while it had replies. A
// tombstone has `deletedAt` set and text, userId, user, mood and poll null.
export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null on a tombstone',
  })
  text!: string | null;

  @ApiProperty({ enum: QUACK_MOODS, nullable: true })
  mood!: QuackMood | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null on a tombstone',
  })
  userId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Set on a tombstone: deleted while it had replies',
  })
  deletedAt!: Date | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The quack this one replies to; null for a top-level quack',
  })
  parentId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The thread's top-level quack; null for a top-level quack",
  })
  rootId!: string | null;

  @ApiProperty({
    type: QuackUserDto,
    nullable: true,
    description: 'null on a tombstone',
  })
  user!: QuackUserDto | null;

  @ApiProperty({
    type: QuackPollDto,
    nullable: true,
    description: 'null for a quack without a poll',
  })
  poll!: QuackPollDto | null;

  @ApiProperty({
    description:
      'Live replies anywhere in the thread this quack starts; 0 for a reply',
  })
  replyCount!: number;

  @ApiProperty({
    type: QuackParentDto,
    nullable: true,
    description: 'Who a reply answers; null for a top-level quack',
  })
  parent!: QuackParentDto | null;

  static fromDomain(quack: Quack): QuackResponseDto {
    if (
      quack.user === undefined ||
      quack.poll === undefined ||
      quack.replyCount === undefined ||
      quack.parent === undefined
    ) {
      throw new Error(
        `QuackResponseDto.fromDomain expected user, poll, replyCount and parent to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      deletedAt: quack.deletedAt,
      parentId: quack.parentId,
      rootId: quack.rootId,
      user: quack.user
        ? {
            id: quack.user.id,
            name: quack.user.name,
            username: quack.user.username,
          }
        : null,
      poll: quack.poll ? QuackPollDto.fromDomain(quack.poll) : null,
      replyCount: quack.replyCount,
      parent: quack.parent
        ? { id: quack.parent.id, username: quack.parent.username }
        : null,
    };
  }
}
