import { QUACK_SCOPES, QuackScope } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListQuacksQuery {
  @ApiProperty({
    description:
      '"all" (default): top-level quacks, no replies. "mine": everything the signed-in user wrote, replies included.',
    enum: QUACK_SCOPES,
    required: false,
    default: 'all',
  })
  @IsOptional()
  @IsIn(QUACK_SCOPES)
  scope?: QuackScope;
}
