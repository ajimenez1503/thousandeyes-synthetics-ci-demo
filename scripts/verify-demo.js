'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const cases = {
  healthy: { outcome: 'success', exit: '0', statuses: ['passed', 'passed'], counts: [2, 0, 0, 0, 0, 0] },
  blocking: { outcome: 'failure', exit: '1', statuses: ['failed'], counts: [0, 1, 0, 0, 0, 0] },
  'non-blocking': { outcome: 'success', exit: '0', statuses: ['failed'], counts: [0, 1, 1, 0, 0, 0] },
  incomplete: { outcome: 'failure', exit: '1', statuses: ['timed-out'], counts: [0, 0, 0, 0, 1, 0] }
};
const countNames = ['passed', 'failed', 'non-blocking-failed', 'skipped', 'timed-out', 'errors'];

function verifyDemo(steps) {
  const paths = new Set();
  const runs = new Set();
  for (const [name, expected] of Object.entries(cases)) {
    const step = steps[name];
    assert.ok(step, `${name}: step exists`);
    assert.equal(step.outcome, expected.outcome, `${name}: actual Action outcome`);
    const output = step.outputs;
    assert.equal(output['exit-code'], expected.exit, `${name}: CLI exit code`);
    countNames.forEach((key, index) => {
      assert.equal(output[key], String(expected.counts[index]), `${name}: ${key} counts tests, not agents`);
    });
    assert.ok(output['json-report'] && output['junit-report'], `${name}: report path outputs`);
    const report = JSON.parse(fs.readFileSync(output['json-report'], 'utf8'));
    assert.equal(report.version, 1);
    assert.match(report.runId, /^[a-f0-9]{24}$/);
    assert.equal(output['run-id'], report.runId);
    assert.deepEqual(report.tests.map(test => test.status), expected.statuses, `${name}: reported statuses`);
    assert.ok(report.tests.every(test => test.agents.length === 2), `${name}: both assigned agents appear`);
    if (name === 'non-blocking') assert.equal(report.tests[0].executionRule, 'non-blocking');
    if (name === 'incomplete') {
      assert.ok(report.tests[0].agents.some(agent => agent.status === 'passed'), 'incomplete: one agent supplied measurements');
      assert.ok(report.tests[0].agents.some(agent => agent.status === 'timed-out'), 'incomplete: missing agent timed out');
    }
    const xml = fs.readFileSync(output['junit-report'], 'utf8');
    assert.ok(xml.includes('<testsuite') && xml.includes('</testsuite>'), `${name}: JUnit exists`);
    if (name === 'healthy') assert.ok(!/<(?:failure|error)\b/.test(xml));
    if (['blocking', 'non-blocking'].includes(name)) assert.ok(xml.includes('<failure'), `${name}: failure in JUnit`);
    if (name === 'incomplete') assert.ok(xml.includes('<error'), 'incomplete: timeout in JUnit');
    paths.add(output['json-report']);
    runs.add(report.runId);
  }
  assert.equal(paths.size, 4, 'Each call has its own reports');
  assert.equal(runs.size, 4, 'Each call has its own execution identity');
}

if (require.main === module) {
  try {
    verifyDemo(JSON.parse(process.env.DEMO_RESULTS || '{}'));
    console.log('All four scenarios passed, including two-agent test counts and partial-result timeout.');
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        '\n## Demo verification\n\nAll four expected outcomes and report counts matched. Measurements came from a loopback mock API with a fake token. No live ThousandEyes tests were created.\n');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { verifyDemo };
