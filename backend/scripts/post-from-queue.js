const fs = require('fs/promises');
const path = require('path');
const { logSuccess, logError } = require('../utils/logWriter');

const queuePath = path.join(__dirname, '../queue/postQueue.json');

async function loadQueue() {
  try {
    const data = await fs.readFile(queuePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load post queue:', err);
    return [];
  }
}

async function saveQueue(posts) {
  await fs.writeFile(queuePath, JSON.stringify(posts, null, 2));
}

async function dispatch(post, platforms) {
  const mod = await import('./platforms/post-to-all.js');
  return mod.postToAllPlatforms(post, platforms);
}

async function processQueue() {
  const posts = await loadQueue();
  const now = new Date();
  const remaining = [];

  for (const post of posts) {
    if (post.status !== 'approved') { remaining.push(post); continue; }
    if (new Date(post.scheduled_at) > now) { remaining.push(post); continue; }

    const platforms = post.platforms || (post.platform ? [post.platform] : []);
    try {
      const results = await dispatch(post, platforms);
      for (const res of results) {
        if (res.status === 'success') logSuccess(post, res.platform);
        else logError(post, res.platform, res.error || res.reason);
      }
    } catch (err) {
      platforms.forEach(pl => logError(post, pl, err));
    }
  }

  await saveQueue(remaining);
}

processQueue();
