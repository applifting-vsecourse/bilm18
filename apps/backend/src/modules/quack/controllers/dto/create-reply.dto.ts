import { PickType } from '@nestjs/swagger';
import { CreateQuackDto } from './create-quack.dto';

// Same rules for text and mood as a quack. No poll: the controller's
// ValidationPipe (forbidNonWhitelisted) answers 400 to `pollOptions`.
export class CreateReplyDto extends PickType(CreateQuackDto, [
  'text',
  'mood',
] as const) {}
