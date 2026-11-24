import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { PrismaService } from '@/core/prisma/prisma.service';
import { UserRole } from '@/generated/prisma/client';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

/** The real app (all modules, BetterAuth, /api prefix) on the test database. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  return app;
}

/** Empties every table except Prisma's migration history. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

// Seed accounts (src/scripts/seed/seed/seed-database.ts), so cases written
// against the seed read the same in the tests.
export const users = {
  caffeinatedDuck: {
    email: 'caffeinatedduck@example.com',
    password: 'password1',
    name: 'Caffeinated Duck',
  },
  deepDuckThoughts: {
    email: 'deepduckthoughts@example.com',
    password: 'password2',
    name: 'Deep Duck Thoughts',
  },
  breadCritic: {
    email: 'breadcritic@example.com',
    password: 'password3',
    name: 'The Bread Critic',
  },
  // Role admin — see signedInAdmin.
  superadmin: {
    email: 'admin@example.com',
    password: 'adminpassword',
    name: 'Admin (Delete in Prod)',
  },
};

/**
 * Signs a user up through BetterAuth and returns an agent that carries the
 * session cookie — every request it sends is made as that user.
 */
export async function signedInAgent(
  app: INestApplication,
  user: { email: string; password: string; name: string },
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app.getHttpServer());
  await agent.post('/api/auth/sign-up/email').send(user).expect(200);
  return agent;
}

/**
 * Like signedInAgent, then makes the user an admin — the role is set in the
 * database, as the seed does; nobody can sign up as an admin.
 */
export async function signedInAdmin(
  app: INestApplication,
  user: { email: string; password: string; name: string },
): Promise<ReturnType<typeof request.agent>> {
  const agent = await signedInAgent(app, user);
  await app.get(PrismaService).user.update({
    where: { email: user.email },
    data: { role: UserRole.admin },
  });
  return agent;
}
