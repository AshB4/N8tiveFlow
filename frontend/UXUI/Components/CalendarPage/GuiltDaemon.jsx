// File: UXUI/Components/Global/GuiltDaemon.jsx
import React, { useEffect, useState } from "react";

const messages = [
  "Only bots work harder than you.",
  "The calendar hungers for content.",
  "Even the CRON jobs judge you.",
  "Your engagement rate is crying.",
  "Rest is a myth. Post anyway.",
  "You skipped ‘Guilt Daemon Day’? Bold.",
  "Productivity: not found (404).",
  "Somewhere, a fan just unsubscribed.",
  "Reboot your discipline.",
  "You’ve been idle longer than your CPU.",
  "Deadlines aren’t suggestions.",
  "Your last post aged... poorly.",
  "You said you’d schedule it yesterday.",
  "Attention is a currency. You're broke.",
  "No post? No purpose.",
  "Dreams don’t queue themselves.",
  "Is that procrastination... I smell?",
  "The algorithm forgets quickly.",
  "You’re ghosting your future self.",
  "Less vibe. More publish.",
  "Another day, another excuse.",
  "One post closer to relevancy. But not today.",
  "Your to-do list called. It’s crying.",
  "Your silence is deafening.",
  "Consistency isn’t a someday thing.",
  "Post like someone’s watching. Because they are.",
  "Your schedule has trust issues now.",
  "Don’t make the daemon log this.",
  "Inactivity logged. Shame pending.",
  "You disappoint in high resolution.",
  "Abandoned drafts don’t build empires.",
  "A bot would’ve posted by now.",
  "You're letting down your backlog.",
  "Guilt is a feature. Use it.",
  "There are no badges for thinking about posting.",
  "You owe inspiration. With interest.",
  "Content doesn’t post itself. Yet.",
  "This is why your last post flopped.",
  "Did you think the daemon wouldn’t notice?",
  "Execution over intention. Always.",
  "Ideas are worthless unpublished.",
  "Do it for the dopamine. Or at least the data.",
  "You haven't earned your dopamine today.",
  "That blinking cursor used to respect you.",
  "Even your drafts feel abandoned.",
  "Your rivals posted 3x already today.",
  "Talk less. Post more.",
  "You’re becoming your own bottleneck.",
  "Another opportunity missed. Shall we continue?",
  "Action is the antidote. Guilt is the symptom.",
  "Don’t let this be another 'almost'."
];


const GuiltDaemon = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const index = Math.floor(Math.random() * messages.length);
    setMessage(messages[index]);
  }, []);

  return (
    <div className="bg-black text-pink-500 border-2 border-teal-300 p-4 w-64 shadow-xl text-center font-mono 
  mx-auto sm:mx-0 sm:ml-4">
      <h2 className="text-xl mb-2">GUILT<br />DAEMON</h2>
      <div className="text-sm text-teal-400">
      <div className="mt-2 text-3xl sm:text-xl">💀</div>
        <p className="mt-2">{message}</p>
      </div>
    </div>
  );
};

export default GuiltDaemon;

// Future idea: make GuiltDaemon aware of inactivity over time and add to BE
// Log lastPostedAt in posted-log.json
// Show evolving guilt messages based on:
// ⏳ Time since last post
// 📅 Missed scheduled posts
// 🗃️ Empty or bloated queues
// 💬 Example:
// “It’s been 4 days. The algorithm forgot your name.”
// “That draft is molding. Publish it or let it die.
// 🧪 Adds a subtle psychological poke to the UI — because pain is a feature.
