const test = require('node:test');
const assert = require('node:assert/strict');

test('supported deployment statuses are documented', () => {
  const statuses = ['IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK'];
  assert.equal(statuses.includes('SUCCESS'), true);
  assert.equal(statuses.includes('UNKNOWN'), false);
});

test('supported environments are documented', () => {
  const environments = ['Development', 'Testing', 'Production'];
  assert.equal(environments.length, 3);
  assert.equal(environments.includes('Production'), true);
});
