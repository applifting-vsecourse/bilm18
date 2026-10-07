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
});
