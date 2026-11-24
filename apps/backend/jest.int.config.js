// Integration tests: *.int-spec.ts, real HTTP (supertest) against the Nest app
// and a real database (quacker_test, never the dev one — see
// src/test/int/test-database-url.ts). Run with `pnpm backend test:int`.
const { jest: unit } = require('./package.json');

module.exports = {
  ...unit,
  testRegex: '\\.int-spec\\.ts$',
  // The whole app loads here, including the React email templates (.tsx).
  moduleFileExtensions: [...unit.moduleFileExtensions, 'tsx'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // better-auth ships ESM only, @react-email/render calls import():
    // rewrite those files to plain CommonJS.
    '^.+\\.[mc]?js$': '<rootDir>/src/test/int/esm-to-cjs.transform.js',
  },
  // Transform only those packages; everything else loads as is.
  // (No path separators in the pattern, so it reads the same on Windows.)
  transformIgnorePatterns: [
    '^(?!.*\\.pnpm.(better-auth|@better-auth|better-call|@react-email|rou3|defu|jose|nanostores|@noble|kysely|uncrypto)[@+]).*node_modules',
  ],
  setupFiles: ['<rootDir>/src/test/int/env.ts'],
  globalSetup: '<rootDir>/src/test/int/global-setup.ts',
  // One database for all files: run them one after another.
  maxWorkers: 1,
  testTimeout: 30000,
};
