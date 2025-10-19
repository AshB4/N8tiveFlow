const fs = require('fs');
const path = require('path');

const postLogPath = path.join(__dirname, '..', 'queue', 'postQueue.json');

function getLastPosts(tag, limit = 5) {
  if (!fs.existsSync(postLogPath)) return [];
  const posts = JSON.parse(fs.readFileSync(postLogPath, 'utf-8'));
  return posts.filter(p => p.tags?.includes(tag)).slice(-limit);
}

function quotePost(postId) {
  if (!fs.existsSync(postLogPath)) return null;
  const posts = JSON.parse(fs.readFileSync(postLogPath, 'utf-8'));
  return posts.find(p => p.id === postId) || null;
}

module.exports = { getLastPosts, quotePost };
