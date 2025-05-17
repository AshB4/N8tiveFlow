//Tracks failed or rejected posts (for debugging or retry logic).// rejected-log.js

// 🛑 Tracks failed or rejected posts (for debugging or retry logic)
// Reasons may include: platform unavailable, missing image, bad status, duplicate ID, etc.

module.exports = [
  {
    id: 3,
    title: "🔥 Terminal Tarot Promo",
    platform: "Pinterest",
    attempted_at: "2025-05-10T16:12:00",
    reason: "Image missing or invalid format"
  },
  {
    id: 4,
    title: "👁️ GhostSheet Launch",
    platform: "X",
    attempted_at: "2025-05-10T16:15:00",
    reason: "Platform not in active_platforms list"
  }
];
