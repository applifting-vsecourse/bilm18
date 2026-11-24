// Jest transformer for ESM-only packages in node_modules (better-auth and its
// dependencies). Node 24 loads them via require(esm); Jest can't, so they are
// rewritten to CommonJS. Used by jest.int.config.js only.
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { transformSync, version } = require('esbuild');

const options = {
  format: 'cjs',
  loader: 'js',
  target: 'node24',
  sourcemap: true,
  // `await import('node:async_hooks')` in @better-auth/core would need
  // Jest's experimental VM modules; turn it into a require() as well.
  supported: { 'dynamic-import': false },
};

// Editing this file must invalidate Jest's transform cache.
const self = readFileSync(__filename, 'utf8');

module.exports = {
  getCacheKey(source, filename) {
    return createHash('sha256')
      .update(self)
      .update(version)
      .update(filename)
      .update(source)
      .digest('hex');
  },
  process(source, filename) {
    const { code, map } = transformSync(source, {
      ...options,
      sourcefile: filename,
    });
    return { code, map };
  },
};
