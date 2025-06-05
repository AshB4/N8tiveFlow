const fs = require('fs');
const path = require('path');

const postedLogPath = path.join(__dirname, '../config/posted-log.json');
const errorLogPath = path.join(__dirname, '../config/post-error.json');

function appendEntry(filePath, entry) {
  let data = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(raw);
    } catch {
      data = [];
    }
  }
  data.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function logSuccess(post, platform) {
  const entry = {
    id: post.id,
    title: post.title,
    platform,
    posted_at: new Date().toISOString(),
  };
  appendEntry(postedLogPath, entry);
}

function logError(post, platform, error) {
  const entry = {
    id: post.id,
    title: post.title,
    platform,
    attempted_at: new Date().toISOString(),
    error: error && error.message ? error.message : String(error),
  };
  appendEntry(errorLogPath, entry);
}

module.exports = { logSuccess, logError };
