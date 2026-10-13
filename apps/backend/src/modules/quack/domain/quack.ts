export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export type QuackPollOption = {
  id: string;
  text: string;
  votes: number;
};

// Only totals and the viewer's own vote — who voted for what never leaves
// the repository.
export type QuackPoll = {
  options: QuackPollOption[];
  totalVotes: number;
  myVoteOptionId: string | null;
};

export type Quack = {
  id: string;
  text: string;
  mood: QuackMood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  // null for a quack without options; undefined when not loaded.
  poll?: QuackPoll | null;
};
