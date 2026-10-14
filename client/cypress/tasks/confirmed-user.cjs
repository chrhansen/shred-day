const { execFileSync } = require('node:child_process');
const path = require('node:path');

function validateFixtureContext(env, apiUrl, email) {
  if (env.RAILS_ENV !== 'test') throw new Error('Cypress fixtures require RAILS_ENV=test.');
  let api, database;
  try {
    api = new URL(apiUrl);
    database = new URL(env.DATABASE_URL || '');
  } catch {
    throw new Error('Valid local test API and database URLs are required.');
  }
  const local = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (api.protocol !== 'http:' || !local.has(api.hostname)) throw new Error('Cypress fixtures require a local test API.');
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !local.has(database.hostname) || database.pathname !== '/shred_day_test') {
    throw new Error('Cypress fixtures require the local shred_day_test database.');
  }
  if (typeof email !== 'string' || !/^[a-z0-9._+-]+@example\.(com|test)$/i.test(email)) {
    throw new Error('Cypress fixtures require a synthetic example-domain email.');
  }
}

function createConfirmedUser(config, input) {
  validateFixtureContext(process.env, config.env.apiUrl, input.email);
  if (typeof input.password !== 'string' || input.password.length < 8) throw new Error('A synthetic fixture password is required.');
  try {
    const output = execFileSync('bundle', ['exec', 'rails', 'runner', path.join(__dirname, 'create-confirmed-user.rb')], {
      cwd: path.resolve(__dirname, '../../../server'), env: process.env,
      input: JSON.stringify({ email: input.email, password: input.password }),
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1024 * 1024,
    });
    const match = output.match(/CYPRESS_FIXTURE_START(.*?)CYPRESS_FIXTURE_END/s);
    if (!match) throw new Error('Missing fixture result');
    return { status: 201, body: JSON.parse(match[1]) };
  } catch {
    throw new Error('Could not create the isolated synthetic test fixture; runner output suppressed.');
  }
}

module.exports = { createConfirmedUser, validateFixtureContext };
