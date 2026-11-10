import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateQuackDto } from './dto/create-quack.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListQuacksQuery } from './dto/list-quacks.query';
import { QuackPollDto, QuackResponseDto } from './dto/quack.response.dto';
import { VoteDto } from './dto/vote.dto';

@ApiTags('quacks')
@Controller('quacks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({
    summary:
      'List quacks: the feed (top-level quacks, newest first), or everything you wrote',
  })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 400, description: 'Unknown scope' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: ListQuacksQuery,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(user, query.scope);
    return quacks.map(QuackResponseDto.fromDomain);
  }

  @Get(':quackId/thread')
  @ApiOperation({
    summary:
      'The whole thread a quack belongs to, oldest first — pass the top-level quack or any reply',
  })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async thread(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<QuackResponseDto[]> {
    const thread = await this.quacksService.getThread(user, quackId);
    return thread.map(QuackResponseDto.fromDomain);
  }

  @Post(':quackId/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a quack or to another reply' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid text or mood, or a poll — replies have none',
  })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 404,
    description: 'Quack not found, or deleted — nobody can reply to it',
  })
  async reply(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: CreateReplyDto,
  ): Promise<QuackResponseDto> {
    const reply = await this.quacksService.createReply(user, quackId, {
      text: body.text,
      mood: body.mood,
    });
    return QuackResponseDto.fromDomain(reply);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.createQuack(user, {
      text: body.text,
      mood: body.mood,
      pollOptions: body.pollOptions,
    });
    return QuackResponseDto.fromDomain(quack);
  }

  @Delete(':quackId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a quack — your own, or anyone's as an admin",
    description:
      'A quack with replies stays in its thread as "deleted", with its text, author, mood and poll gone; the replies stay.',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: 'Someone else wrote this quack and you are not an admin',
  })
  @ApiResponse({ status: 404, description: 'Quack not found' })
  async delete(
    @User() user: Identity,
    @Param('quackId') quackId: string,
  ): Promise<void> {
    await this.quacksService.deleteQuack(user, quackId);
  }

  @Put(':quackId/vote')
  @ApiOperation({
    summary: 'Vote in a poll, or move your vote to another option',
  })
  @ApiResponse({ status: 200, type: QuackPollDto })
  @ApiResponse({ status: 400, description: 'Option is not part of this poll' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Quack not found or has no poll' })
  async vote(
    @User() user: Identity,
    @Param('quackId') quackId: string,
    @Body() body: VoteDto,
  ): Promise<QuackPollDto> {
    const poll = await this.quacksService.vote(user, quackId, body.optionId);
    return QuackPollDto.fromDomain(poll);
  }
}
