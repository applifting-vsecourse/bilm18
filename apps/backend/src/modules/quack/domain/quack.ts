export const QUACK_MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type QuackMood = (typeof QUACK_MOODS)[number];

export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 7;
export const POLL_OPTION_MAX_LENGTH = 50;

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

// Which quack a reply answers, as the reply's list item names it
// ("Replying to @BreadCritic"). `username` is null when that quack has
// since been deleted and is a tombstone.
export type QuackParent = {
  id: string;
  username: string | null;
};

// A live quack, or a tombstone: a quack deleted while it had replies
// (docs/adr/0001). A tombstone has `deletedAt` set and no text, author,
// mood or poll — it only keeps its place in the thread.
export type Quack = {
  id: string;
  // null only on a tombstone.
  text: string | null;
  mood: QuackMood | null;
  // null only on a tombstone.
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  // Both null for a top-level quack; both set for a reply.
  parentId: string | null;
  rootId: string | null;
  // null on a tombstone; undefined when not loaded.
  user?: QuackAuthor | null;
  // null for a quack without options; undefined when not loaded.
  poll?: QuackPoll | null;
  // Live replies anywhere in the thread this quack starts. Always 0 for a
  // reply. undefined when not loaded.
  replyCount?: number;
  // null for a top-level quack; undefined when not loaded.
  parent?: QuackParent | null;
};

export const isTombstone = (quack: Pick<Quack, 'deletedAt'>): boolean =>
  quack.deletedAt !== null;

// Which quacks a list shows: top-level quacks only (the feed), or everything
// the viewer wrote, replies included.
export const QUACK_SCOPES = ['all', 'mine'] as const;
export type QuackScope = (typeof QUACK_SCOPES)[number];
