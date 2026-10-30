'use strict';

const fs = require('node:fs');
const path = require('node:path');

const statePath = path.join(process.env.GITHUB_WORKSPACE || process.cwd(), '.demo/mock-state.json');
if (fs.existsSync(statePath)) {
  const { pid } = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid owned mock process ID');
  try { process.kill(pid, 'SIGTERM'); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
  fs.unlinkSync(statePath);
}
