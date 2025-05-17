// 2BpostedQ.js

// 🧠 Poster Monster Queue
// Only posts with:
// - status === 'approved'
// - platform ∈ active_platforms
// - not in posted-log.js
// will be fired and marked as 'posted'

module.exports = [
  {
    id: 1,
    title: "🌩️ PromptStorm Core is Live",
    body: "No more overthinking. Just ship smarter. #devtools #productivity",
    platforms: ["LinkedIn"],
    image: "promptstorm-cover.png",
    status: "approved"
  },
  {
    id: 2,
    title: "🦴 Goblin Self-Care Kit",
    body: "Filthy. Fabulous. Full of affirmations. #ColoringBook #GoblinMode",
    platforms: ["Reddit", "Pinterest"],
    image: "goblin-kit-header.png",
    status: "draft" // 💤 Not ready yet
  }
];
