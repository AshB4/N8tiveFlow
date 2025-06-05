const fs = require('fs');
const path = require('path');

const draftPath = path.join(__dirname, 'data', 'privateDrafts.json');

function loadDrafts() {
  if (!fs.existsSync(draftPath)) return [];
  return JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
}

function saveDrafts(drafts) {
  fs.writeFileSync(draftPath, JSON.stringify(drafts, null, 2));
}

function addDraft(draft) {
  const drafts = loadDrafts();
  drafts.push(draft);
  saveDrafts(drafts);
}

function getDrafts() {
  return loadDrafts();
}

module.exports = {
  addDraft,
  getDrafts,
};
