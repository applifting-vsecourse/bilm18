import {
  BIO_MAX_LENGTH,
  USERNAME_PATTERN,
} from '@/modules/profile/domain/profile';
import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @ApiProperty({
    description: '3–30 letters, digits, dots or underscores',
    example: 'CaffeinatedDuck',
  })
  @Transform(trim)
  @IsString()
  @Matches(USERNAME_PATTERN, {
    message:
      'username must be 3–30 characters: letters, digits, dots and underscores',
  })
  username!: string;

  @ApiProperty({ description: 'Display name', example: 'Caffeinated Duck' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Short bio. Send null or leave out to clear it.',
    maxLength: BIO_MAX_LENGTH,
    required: false,
    nullable: true,
    type: String,
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX_LENGTH)
  bio?: string | null;

  @ApiProperty({
    description: 'Mood pre-selected for new quacks. Null for no mood.',
    enum: QUACK_MOODS,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  defaultMood?: QuackMood | null;
}
