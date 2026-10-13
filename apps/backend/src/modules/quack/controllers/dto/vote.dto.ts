import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VoteDto {
  @ApiProperty({ description: 'The poll option to vote for' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
