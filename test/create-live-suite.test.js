'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createLiveSuite } = require('../scripts/create-live-suite');

const valid = {
  DEMO_ACCOUNT_GROUP_ID: '123456',
  DEMO_AGENT_IDS: '6, 7',
  DEMO_TARGET_URL: 'https://demo.example.com/health?mode=ci'
};

test('creates HTTP and TCP tests for every selected agent', () => {
  const { suite, apiBaseURL } = createLiveSuite(valid);
  assert.equal(apiBaseURL, 'https://api.thousandeyes.com');
  assert.equal(suite.accountGroupId, '123456');
  assert.equal(suite.timeout, '5m');
  assert.equal(suite.pollInterval, '5s');
  const [http, network] = suite.tests;
  assert.deepEqual(http.config.agents, [{ agentId: '6' }, { agentId: '7' }]);
  assert.equal(http.config.url, valid.DEMO_TARGET_URL);
  assert.equal(http.config.desiredStatusCode, '200');
  assert.equal(http.config.networkMeasurements, false);
  assert.deepEqual(http.thresholds, { expectedResponseCodes: [200], maxResponseTime: 2000, maxTotalTime: 3000 });
  assert.equal(http.executionRule, 'blocking');
  assert.deepEqual(network.config, { server: 'demo.example.com', port: 443, protocol: 'tcp', agents: http.config.agents });
  assert.deepEqual(network.thresholds, { maxLoss: 0, maxLatency: 150, maxJitter: 50 });
});

for (const [scenario, rule] of [['blocking-failure', 'blocking'], ['non-blocking-failure', 'non-blocking']]) {
  test(`${scenario} changes only the HTTP expectation and rule`, () => {
    const { suite } = createLiveSuite({ ...valid, DEMO_SCENARIO: scenario });
    assert.equal(suite.tests[0].executionRule, rule);
    assert.deepEqual(suite.tests[0].thresholds.expectedResponseCodes, [599]);
    assert.equal(suite.tests[0].config.desiredStatusCode, '599');
    assert.deepEqual(suite.tests[1], createLiveSuite(valid).suite.tests[1]);
  });
}

test('permits explicit network host and port with the STG API', () => {
  const { suite, apiBaseURL } = createLiveSuite({ ...valid, DEMO_NETWORK_HOST: '192.0.2.1', DEMO_NETWORK_PORT: '8443', DEMO_API_BASE_URL: 'https://api.stg.thousandeyes.com/' });
  assert.equal(apiBaseURL, 'https://api.stg.thousandeyes.com');
  assert.equal(suite.tests[1].config.server, '192.0.2.1');
  assert.equal(suite.tests[1].config.port, 8443);
});

test('supports IPv6 targets without adding a port to the network server', () => {
  const { suite } = createLiveSuite({ ...valid, DEMO_TARGET_URL: 'https://[2001:db8::1]/health' });
  assert.equal(suite.tests[1].config.server, '2001:db8::1');
});

const invalidInputs = [
  ['DEMO_ACCOUNT_GROUP_ID', ''], ['DEMO_ACCOUNT_GROUP_ID', '0'], ['DEMO_ACCOUNT_GROUP_ID', 'x'],
  ['DEMO_AGENT_IDS', ''], ['DEMO_AGENT_IDS', '0'], ['DEMO_AGENT_IDS', '6,6'],
  ['DEMO_AGENT_IDS', '1,2,3,4,5,6'], ['DEMO_AGENT_IDS', '6,'], ['DEMO_AGENT_IDS', '6; echo unsafe'],
  ['DEMO_TARGET_URL', 'http://example.com'], ['DEMO_TARGET_URL', 'https://user:secret@example.com'],
  ['DEMO_TARGET_URL', 'https://example.com/#fragment'], ['DEMO_TARGET_URL', 'https://example.com/#'],
  ['DEMO_TARGET_URL', 'https://-bad.example.com/'], ['DEMO_TARGET_URL', 'https://exa\nmple.com'],
  ['DEMO_NETWORK_HOST', 'example.com:443'], ['DEMO_NETWORK_HOST', 'https://example.com'],
  ['DEMO_NETWORK_HOST', '-bad.example'], ['DEMO_NETWORK_PORT', '0'], ['DEMO_NETWORK_PORT', '65536'],
  ['DEMO_NETWORK_PORT', '443.0'], ['DEMO_NETWORK_PORT', '1e3'], ['DEMO_SCENARIO', 'unknown'],
  ['DEMO_API_BASE_URL', 'https://external.invalid'], ['DEMO_API_BASE_URL', 'http://api.thousandeyes.com'],
  ['DEMO_API_BASE_URL', 'https://api.thousandeyes.com/v7'], ['DEMO_API_BASE_URL', 'https://api.thousandeyes.com?x=1'],
  ['DEMO_API_BASE_URL', 'https://api.thousandeyes.com?'], ['DEMO_API_BASE_URL', 'https://api.thousandeyes.com#'],
  ['DEMO_API_BASE_URL', 'https://api.thousandeyes.com#x'], ['DEMO_API_BASE_URL', 'https://user:secret@api.thousandeyes.com'],
  ['DEMO_API_BASE_URL', 'https://api.thousandeyes.com:444']
];

for (const [field, input] of invalidInputs) {
  test(`rejects unsafe ${field}: ${invalidInputs.findIndex((entry) => entry[0] === field && entry[1] === input)}`, () => {
    assert.throws(() => createLiveSuite({ ...valid, [field]: input }), (error) => {
      assert.ok(error.message.startsWith(field), error.message);
      if (input.includes('secret')) assert.ok(!error.message.includes('secret'));
      return true;
    });
  });
}

test('accepts five unique positive agent IDs', () => {
  const { suite } = createLiveSuite({ ...valid, DEMO_AGENT_IDS: '1,2,3,4,5' });
  assert.equal(suite.tests[0].config.agents.length, 5);
});

test('CLI writes the suite to the working directory without printing configuration', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'te-demo-live-'));
  try {
    const result = spawnSync(process.execPath, [path.join(__dirname, '../scripts/create-live-suite.js')], {
      cwd: directory, env: valid, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'Created .demo/live.json.');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, '.demo/live.json'), 'utf8')), createLiveSuite(valid).suite);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI rejects an unsafe target before writing a suite and redacts its value', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'te-demo-live-'));
  try {
    const result = spawnSync(process.execPath, [path.join(__dirname, '../scripts/create-live-suite.js')], {
      cwd: directory, env: { ...valid, DEMO_TARGET_URL: 'https://user:known-secret@example.com' }, encoding: 'utf8'
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^DEMO_TARGET_URL/);
    assert.ok(!`${result.stdout}${result.stderr}`.includes('known-secret'));
    assert.equal(fs.existsSync(path.join(directory, '.demo/live.json')), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
