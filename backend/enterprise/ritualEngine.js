const fs = require('fs');
const path = require('path');

const ritualPath = path.join(__dirname, 'data', 'rituals.json');

function loadRituals() {
  if (!fs.existsSync(ritualPath)) return [];
  return JSON.parse(fs.readFileSync(ritualPath, 'utf-8'));
}

function saveRituals(rituals) {
  fs.writeFileSync(ritualPath, JSON.stringify(rituals, null, 2));
}

function addRitual(ritual) {
  const rituals = loadRituals();
  rituals.push({ ...ritual, posts: [] });
  saveRituals(rituals);
}

function assignPost(ritualName, postId) {
  const rituals = loadRituals();
  const r = rituals.find(x => x.name === ritualName);
  if (r && !r.posts.includes(postId)) {
    r.posts.push(postId);
    saveRituals(rituals);
  }
}

function getRituals() {
  return loadRituals();
}

module.exports = {
  addRitual,
  assignPost,
  getRituals,
};
