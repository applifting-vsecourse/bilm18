// Jest `globalSetup`: once per run, bring the test database to the schema of
// our Prisma migrations. `migrate deploy` creates the database if it is missing.
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { testDatabaseUrl } from './test-database-url';

export default function globalSetup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}
