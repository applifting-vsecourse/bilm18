import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReplyDto } from './create-reply.dto';

// The same options as the ValidationPipe on QuacksController.
const errorsFor = async (body: object): Promise<string[]> =>
  (
    await validate(plainToInstance(CreateReplyDto, body), {
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  ).map((error) => error.property);

describe('CreateReplyDto', () => {
  it('accepts text, with or without a mood', async () => {
    await expect(
      errorsFor({ text: 'Rice works. So does bread, allegedly.' }),
    ).resolves.toEqual([]);
    await expect(
      errorsFor({ text: 'it was a sourdough keyboard now', mood: 'silly' }),
    ).resolves.toEqual([]);
  });

  it('has the same text rules as a quack', async () => {
    await expect(errorsFor({ text: '' })).resolves.toEqual(['text']);
    await expect(errorsFor({ text: 'x'.repeat(281) })).resolves.toEqual([
      'text',
    ]);
  });

  it('rejects a poll — replies have none', async () => {
    await expect(
      errorsFor({
        text: 'Where do we go for lunch?',
        pollOptions: ['Pizza', 'Sushi'],
      }),
    ).resolves.toEqual(['pollOptions']);
  });
});
