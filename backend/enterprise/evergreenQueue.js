const fs = require('fs');
const path = require('path');

const queuePath = path.join(__dirname, 'data', 'evergreenQueue.json');

function loadQueue() {
  if (!fs.existsSync(queuePath)) return [];
  return JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
}

function saveQueue(queue) {
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

function addEvergreenPost(post) {
  const queue = loadQueue();
  queue.push({ ...post, lastPosted: null, platformsUsed: [], remixVersion: 0 });
  saveQueue(queue);
}

function getNextPost(now = new Date()) {
  const queue = loadQueue();
  const cooldownMs = 1000 * 60 * 60 * 24 * 7; // 7 days
  const post = queue.find(p => !p.lastPosted || (now - new Date(p.lastPosted)) > cooldownMs);
  return post || null;
}

function markPosted(postId, platform) {
  const queue = loadQueue();
  const item = queue.find(p => p.id === postId);
  if (item) {
    item.lastPosted = new Date().toISOString();
    item.platformsUsed.push(platform);
    item.remixVersion += 1;
    saveQueue(queue);
  }
}

module.exports = {
  addEvergreenPost,
  getNextPost,
  markPosted,
};
