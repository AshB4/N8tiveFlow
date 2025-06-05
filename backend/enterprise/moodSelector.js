const fs = require('fs');
const path = require('path');

const moodPath = path.join(__dirname, 'data', 'postMoods.json');

function loadMoods() {
  if (!fs.existsSync(moodPath)) return {};
  return JSON.parse(fs.readFileSync(moodPath, 'utf-8'));
}

function saveMoods(moods) {
  fs.writeFileSync(moodPath, JSON.stringify(moods, null, 2));
}

function setMood(postId, mood) {
  const moods = loadMoods();
  moods[postId] = mood;
  saveMoods(moods);
}

function getMood(postId) {
  const moods = loadMoods();
  return moods[postId] || null;
}

module.exports = { setMood, getMood };
