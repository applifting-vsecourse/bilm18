// Jest `setupFiles`: runs in every test file before any import of the app,
// so PrismaService and Config see the test database.
import 'dotenv/config';
import { testDatabaseUrl } from './test-database-url';

process.env.DATABASE_URL = testDatabaseUrl();
process.env.BETTER_AUTH_SECRET ??= 'integration-test-secret';
