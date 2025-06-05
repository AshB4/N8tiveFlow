const fs = require('fs');
const path = require('path');

const dnaPath = path.join(__dirname, 'data', 'postDNA.json');

function loadDNA() {
  if (!fs.existsSync(dnaPath)) return {};
  return JSON.parse(fs.readFileSync(dnaPath, 'utf-8'));
}

function saveDNA(dna) {
  fs.writeFileSync(dnaPath, JSON.stringify(dna, null, 2));
}

function recordDNA(postId, data) {
  const dna = loadDNA();
  dna[postId] = data;
  saveDNA(dna);
}

function getDNA(postId) {
  const dna = loadDNA();
  return dna[postId] || null;
}

module.exports = {
  recordDNA,
  getDNA,
};
