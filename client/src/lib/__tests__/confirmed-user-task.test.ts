import { validateFixtureContext } from '../../../cypress/tasks/confirmed-user.cjs';

const valid = { RAILS_ENV: 'test', DATABASE_URL: 'postgres://test:test@127.0.0.1:55441/shred_day_test' };
const localApi = 'http://127.0.0.1:3100';
const synthetic = 'test-confirmed@example.test';

it('accepts only an explicitly isolated test runtime, local database/API, and synthetic email', () => {
  expect(() => validateFixtureContext(valid, localApi, synthetic)).not.toThrow();
});

it.each([
  [{ ...valid, RAILS_ENV: 'production' }, localApi, synthetic],
  [{ ...valid, RAILS_ENV: undefined }, localApi, synthetic],
  [valid, 'https://shred.day', synthetic],
  [{ ...valid, DATABASE_URL: 'postgres://test:test@db.example.test/shred_day_test' }, localApi, synthetic],
  [{ ...valid, DATABASE_URL: 'postgres://test:test@127.0.0.1/shred_day_production' }, localApi, synthetic],
  [{ ...valid, DATABASE_URL: '' }, localApi, synthetic],
  [valid, localApi, 'real-person@private-domain.test'],
])('refuses unsafe fixture context %#', (env, api, email) => {
  expect(() => validateFixtureContext(env, api, email)).toThrow();
});
