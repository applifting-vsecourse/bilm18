import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

const valid = {
  username: 'CaffeinatedDuck',
  name: 'Caffeinated Duck',
};

const errorsFor = async (body: object): Promise<string[]> =>
  (await validate(plainToInstance(UpdateProfileDto, body))).map(
    (error) => error.property,
  );

describe('UpdateProfileDto', () => {
  it('accepts a profile without bio or default mood', async () => {
    await expect(errorsFor(valid)).resolves.toEqual([]);
  });

  it.each(['abc', 'Deep.Duck_Thoughts', 'a'.repeat(30), '  BreadCritic  '])(
    'accepts the username "%s"',
    async (username) => {
      await expect(errorsFor({ ...valid, username })).resolves.toEqual([]);
    },
  );

  it.each(['ab', 'a'.repeat(31), 'bread critic', 'bread-critic', 'kachna🦆'])(
    'rejects the username "%s"',
    async (username) => {
      await expect(errorsFor({ ...valid, username })).resolves.toEqual([
        'username',
      ]);
    },
  );

  it('rejects a blank display name', async () => {
    await expect(errorsFor({ ...valid, name: '   ' })).resolves.toEqual([
      'name',
    ]);
  });

  it('accepts a bio of exactly 160 characters and rejects 161', async () => {
    await expect(
      errorsFor({ ...valid, bio: 'q'.repeat(160) }),
    ).resolves.toEqual([]);
    await expect(
      errorsFor({ ...valid, bio: 'q'.repeat(161) }),
    ).resolves.toEqual(['bio']);
  });

  it.each(['happy', 'sad', 'angry', 'silly', null])(
    'accepts the default mood %s',
    async (defaultMood) => {
      await expect(errorsFor({ ...valid, defaultMood })).resolves.toEqual([]);
    },
  );

  it('rejects an unknown default mood', async () => {
    await expect(
      errorsFor({ ...valid, defaultMood: 'grumpy' }),
    ).resolves.toEqual(['defaultMood']);
  });
});
