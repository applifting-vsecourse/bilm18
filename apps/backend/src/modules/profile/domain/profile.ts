import { QuackMood } from '@/modules/quack/domain/quack';

// Same rules as BetterAuth's username plugin, so a name chosen here would also
// have been accepted at sign-up.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

export const BIO_MAX_LENGTH = 160;

export type Profile = {
  username: string;
  name: string;
  bio: string | null;
  defaultMood: QuackMood | null;
};
