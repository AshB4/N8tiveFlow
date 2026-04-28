const fs = require('fs');
const path = require('path');

const abPath = path.join(__dirname, 'data', 'abTests.json');

function loadAB() {
  if (!fs.existsSync(abPath)) return [];
  return JSON.parse(fs.readFileSync(abPath, 'utf-8'));
}

function saveAB(tests) {
  fs.writeFileSync(abPath, JSON.stringify(tests, null, 2));
}

function scheduleTest(test) {
  const tests = loadAB();
  tests.push({ ...test, results: {} });
  saveAB(tests);
}

function logResult(testId, variant, engagement) {
  const tests = loadAB();
  const t = tests.find(x => x.id === testId);
  if (t) {
    t.results[variant] = engagement;
    saveAB(tests);
  }
}

module.exports = {
  scheduleTest,
  logResult,
};
