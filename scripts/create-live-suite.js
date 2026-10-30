'use strict';

const fs = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');

const API_ORIGINS = new Set([
  'https://api.thousandeyes.com',
  'https://api.stg.thousandeyes.com'
]);
const SCENARIOS = new Set(['healthy', 'blocking-failure', 'non-blocking-failure']);

function value(env, name, fallback = '') {
  const input = env[name] === undefined || env[name] === '' ? fallback : env[name];
  if (typeof input !== 'string') throw new Error(`${name} must be text.`);
  return input.trim();
}

function positiveID(input, field) {
  if (!/^[1-9][0-9]*$/.test(input)) throw new Error(`${field} must contain positive numeric IDs.`);
  return input;
}

function hostname(input, field = 'DEMO_NETWORK_HOST') {
  if (net.isIP(input)) return input;
  const labels = input.replace(/\.$/, '').split('.');
  if (input.length > 253 || labels.some((label) =>
    !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))) {
    throw new Error(`${field} must contain a DNS hostname or IP address without a port.`);
  }
  return input;
}

function createLiveSuite(env = process.env) {
  const accountGroupId = positiveID(value(env, 'DEMO_ACCOUNT_GROUP_ID'), 'DEMO_ACCOUNT_GROUP_ID');
  const ids = value(env, 'DEMO_AGENT_IDS').split(',').map((id) => positiveID(id.trim(), 'DEMO_AGENT_IDS'));
  if (ids.length > 5 || new Set(ids).size !== ids.length) {
    throw new Error('DEMO_AGENT_IDS must contain between one and five unique IDs.');
  }
  const rawTarget = value(env, 'DEMO_TARGET_URL');
  let target;
  try { target = new URL(rawTarget); } catch { throw new Error('DEMO_TARGET_URL must be an absolute HTTPS URL.'); }
  if (target.protocol !== 'https:' || target.username || target.password || rawTarget.includes('#') || /[\u0000-\u0020\u007f]/.test(rawTarget)) {
    throw new Error('DEMO_TARGET_URL must use HTTPS without credentials, whitespace, or a fragment.');
  }
  const derivedHost = target.hostname.replace(/^\[|\]$/g, '');
  hostname(derivedHost, 'DEMO_TARGET_URL');
  const networkHost = hostname(value(env, 'DEMO_NETWORK_HOST', derivedHost));
  const rawPort = value(env, 'DEMO_NETWORK_PORT', '443');
  const port = Number(rawPort);
  if (!/^[0-9]+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DEMO_NETWORK_PORT must be an integer between 1 and 65535.');
  }
  const scenario = value(env, 'DEMO_SCENARIO', 'healthy');
  if (!SCENARIOS.has(scenario)) throw new Error('DEMO_SCENARIO is not supported.');
  const rawAPI = value(env, 'DEMO_API_BASE_URL', 'https://api.thousandeyes.com');
  let api;
  try { api = new URL(rawAPI); } catch { throw new Error('DEMO_API_BASE_URL must select the production or STG ThousandEyes API.'); }
  if (!API_ORIGINS.has(api.origin) || api.pathname !== '/' || rawAPI.includes('?') || rawAPI.includes('#') || api.username || api.password || /[\u0000-\u0020\u007f]/.test(rawAPI)) {
    throw new Error('DEMO_API_BASE_URL must select the production or STG ThousandEyes API without a path or credentials.');
  }
  const rawExpectedCode = value(env, 'DEMO_EXPECTED_HTTP_STATUS', '200');
  if (!/^[1-5][0-9]{2}$/.test(rawExpectedCode)) {
    throw new Error('DEMO_EXPECTED_HTTP_STATUS must be an HTTP status code from 100 to 599.');
  }
  const normalCode = Number(rawExpectedCode);
  const expectedCode = scenario === 'healthy' ? normalCode : normalCode === 599 ? 598 : 599;
  const agents = ids.map((agentId) => ({ agentId }));
  return {
    apiBaseURL: api.origin,
    suite: {
      version: 1,
      accountGroupId,
      timeout: '5m',
      pollInterval: '5s',
      tests: [
        {
          name: 'application-health',
          type: 'http-server',
          executionRule: scenario === 'non-blocking-failure' ? 'non-blocking' : 'blocking',
          config: { url: target.href, desiredStatusCode: String(expectedCode), agents, networkMeasurements: false },
          thresholds: { expectedResponseCodes: [expectedCode], maxResponseTime: 2000, maxTotalTime: 3000 }
        },
        {
          name: 'network-connectivity',
          type: 'agent-to-server',
          executionRule: 'blocking',
          config: { server: networkHost, port, protocol: 'tcp', agents },
          thresholds: { maxLoss: 0, maxLatency: 150, maxJitter: 50 }
        }
      ]
    }
  };
}

async function main() {
  const { suite } = createLiveSuite();
  const directory = path.join(process.cwd(), '.demo');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'live.json'), `${JSON.stringify(suite, null, 2)}\n`);
  console.log('Created .demo/live.json.');
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { createLiveSuite };
