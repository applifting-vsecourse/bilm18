// The integration tests wipe every table between tests, so they must never
// point at the dev database. Locally: a separate quacker_test database in the
// same Docker Postgres (port 5433). In CI: a Postgres service on that port.
const DEFAULT_TEST_DATABASE_URL =
  'postgresql://quacker:quacker@localhost:5433/quacker_test';

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const databaseName = new URL(url).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Integration tests truncate every table; refusing to run against "${databaseName}". ` +
        'TEST_DATABASE_URL must name a database ending in _test.',
    );
  }
  return url;
}
