import {
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  QUACK_MOODS,
  QuackMood,
} from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// "  Pizza " is "Pizza": spaces around an option don't count towards its
// length, and don't make it different from another one.
const trimEach = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((item: unknown) =>
        typeof item === 'string' ? item.trim() : item,
      )
    : value;

const ignoringCase = (option: unknown): unknown =>
  typeof option === 'string' ? option.toLowerCase() : option;

export class CreateQuackDto {
  @ApiProperty({
    description: 'Body of the quack',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text!: string;

  @ApiProperty({
    description: 'How the quack is meant to be read. Leave out for no mood.',
    enum: QUACK_MOODS,
    required: false,
    example: 'silly',
  })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  mood?: QuackMood;

  @ApiProperty({
    description:
      'Turns the quack into a poll: the answers to choose from, in order. Leave out for a plain quack.',
    type: [String],
    required: false,
    minItems: POLL_MIN_OPTIONS,
    maxItems: POLL_MAX_OPTIONS,
    example: ['Pizza', 'Sushi', 'Canteen'],
  })
  @IsOptional()
  @Transform(trimEach)
  @IsArray()
  @ArrayMinSize(POLL_MIN_OPTIONS, {
    message: `A poll needs ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS} options`,
  })
  @ArrayMaxSize(POLL_MAX_OPTIONS, {
    message: `A poll needs ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS} options`,
  })
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: 'Poll options cannot be empty' })
  @MaxLength(POLL_OPTION_MAX_LENGTH, {
    each: true,
    message: `Keep each poll option under ${POLL_OPTION_MAX_LENGTH} characters`,
  })
  @ArrayUnique(ignoringCase, { message: 'Poll options must all be different' })
  pollOptions?: string[];
}
