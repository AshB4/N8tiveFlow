const fs = require('fs');
const path = require('path');

const memoryPath = path.join(__dirname, 'data', 'memory.json');

function loadMemory() {
  if (!fs.existsSync(memoryPath)) return {};
  return JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
}

function saveMemory(mem) {
  fs.writeFileSync(memoryPath, JSON.stringify(mem, null, 2));
}

function logPostPerformance(postId, platform, metrics) {
  const mem = loadMemory();
  mem[postId] = mem[postId] || { platformSuccess: {} };
  mem[postId].platformSuccess[platform] = metrics;
  saveMemory(mem);
}

function setBestTone(postId, tone) {
  const mem = loadMemory();
  mem[postId] = mem[postId] || { platformSuccess: {} };
  mem[postId].bestTone = tone;
  saveMemory(mem);
}

function getPostMemory(postId) {
  const mem = loadMemory();
  return mem[postId] || null;
}

module.exports = {
  logPostPerformance,
  setBestTone,
  getPostMemory,
};
