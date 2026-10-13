import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
  @ApiOperation({ summary: 'List all quacks' })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(@User() user: Identity): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(user);
    return quacks.map(QuackResponseDto.fromDomain);
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
