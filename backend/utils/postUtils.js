/** @format */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// JSON file storing canonical relationships
const DB_PATH = path.join(__dirname, '../posts/canonical.json');

function loadCanonicalDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveCanonicalDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Remove UTM parameters from a URL
function stripUtm(url) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) {
        u.searchParams.delete(key);
      }
    }
    u.hash = '';
    return u.origin + u.pathname + (u.searchParams.toString() ? `?${u.searchParams.toString()}` : '');
  } catch {
    return url;
  }
}

// Append UTM parameters to a URL (used for monetized funnels)
function buildUtm(url, params = {}) {
  const clean = stripUtm(url);
  const query = new URLSearchParams(params).toString();
  if (!query) return clean;
  return clean + (clean.includes('?') ? '&' : '?') + query;
}

// Validate that a canonical target is reachable
async function validateCanonicalTarget(url) {
  try {
    const res = await axios.head(url, { timeout: 5000 });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

// Save or update canonical record in JSON DB
function saveCanonicalRecord(record) {
  const db = loadCanonicalDB();
  const idx = db.findIndex((r) => r.originalUrl === record.originalUrl);
  if (idx >= 0) {
    db[idx] = { ...db[idx], ...record };
  } else {
    db.push(record);
  }
  saveCanonicalDB(db);
}

module.exports = {
  stripUtm,
  buildUtm,
  validateCanonicalTarget,
  saveCanonicalRecord,
};
