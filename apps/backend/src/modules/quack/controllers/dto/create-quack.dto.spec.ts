import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuackDto } from './create-quack.dto';

const errorsFor = async (body: object): Promise<string[]> =>
  (await validate(plainToInstance(CreateQuackDto, body))).map(
    (error) => error.property,
  );

describe('CreateQuackDto', () => {
  it('accepts a quack without a mood', async () => {
    await expect(errorsFor({ text: 'hello' })).resolves.toEqual([]);
  });

  it.each(['happy', 'sad', 'angry', 'silly'])(
    'accepts the "%s" mood',
    async (mood) => {
      await expect(errorsFor({ text: 'hello', mood })).resolves.toEqual([]);
    },
  );

  it('rejects an unknown mood', async () => {
    await expect(errorsFor({ text: 'hello', mood: 'grumpy' })).resolves.toEqual(
      ['mood'],
    );
  });

  describe('pollOptions', () => {
    const lunch = 'Where do we go for lunch?';
    const options = (count: number): string[] =>
      Array.from({ length: count }, (_, i) => `Option ${i + 1}`);

    it('accepts a quack without a poll', async () => {
      await expect(errorsFor({ text: lunch })).resolves.toEqual([]);
    });

    it('accepts the seed poll', async () => {
      await expect(
        errorsFor({ text: lunch, pollOptions: ['Pizza', 'Sushi', 'Canteen'] }),
      ).resolves.toEqual([]);
    });

    it.each([2, 7])('accepts %i options', async (count) => {
      await expect(
        errorsFor({ text: lunch, pollOptions: options(count) }),
      ).resolves.toEqual([]);
    });

    it.each([0, 1, 8])('rejects %i options', async (count) => {
      await expect(
        errorsFor({ text: lunch, pollOptions: options(count) }),
      ).resolves.toEqual(['pollOptions']);
    });

    it('rejects an empty option, also when it is only spaces', async () => {
      await expect(
        errorsFor({ text: lunch, pollOptions: ['Pizza', '   '] }),
      ).resolves.toEqual(['pollOptions']);
    });

    it('accepts 50 characters and rejects 51', async () => {
      await expect(
        errorsFor({ text: lunch, pollOptions: ['Pizza', 'x'.repeat(50)] }),
      ).resolves.toEqual([]);
      await expect(
        errorsFor({ text: lunch, pollOptions: ['Pizza', 'x'.repeat(51)] }),
      ).resolves.toEqual(['pollOptions']);
    });

    it('does not count spaces around an option towards its length', async () => {
      await expect(
        errorsFor({
          text: lunch,
          pollOptions: ['Pizza', ` ${'x'.repeat(50)} `],
        }),
      ).resolves.toEqual([]);
    });

    it('rejects "Pizza" and " pizza " as the same option', async () => {
      await expect(
        errorsFor({ text: lunch, pollOptions: ['Pizza', ' pizza ', 'Sushi'] }),
      ).resolves.toEqual(['pollOptions']);
    });

    it('trims the options it keeps', () => {
      const dto = plainToInstance(CreateQuackDto, {
        text: lunch,
        pollOptions: ['  Pizza ', 'Sushi '],
      });

      expect(dto.pollOptions).toEqual(['Pizza', 'Sushi']);
    });

    it('rejects options that are not text', async () => {
      await expect(
        errorsFor({ text: lunch, pollOptions: ['Pizza', 42] }),
      ).resolves.toEqual(['pollOptions']);
    });
  });
});
