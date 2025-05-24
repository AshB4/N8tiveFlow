

export const titles = [
    "📡 Beamed into the Void",
    "💾 Saved to the Cloud",
    "🚀 Mission Accomplished",
    "🎉 Success!",
    "🧠 Brain Uploaded",
    "🪩 It's Scheduled, Babe.",
    "💾 Saved-ish",
    "🪩 It is Finished",
    "🫡 Mission Logged.",
    "📅 Scheduled, Home Skillet 🍳",
    "🫡 Mission Queued — I Gotchu",
    "📬 Hand Delivered by the Algorithm",
    "👊 Scheduled & Sealed — You're Welcome"
  ];
 export const descriptions = [
    "Your brilliance is queued. Now go do crimes (or lunch).",
    "Your data is now floating somewhere above us.",
    "Task completed. Time to take a break!",
    "Everything went smoothly. Celebrate your win!",
    "Your thoughts are now part of the collective.",
    "Go do more stuff or caffeinate, take a nap, idk.",
    "Go touch grass or reload the algorithm — your call.",
    "We tossed it into the content vortex. Hope it sticks.",
    "Vibe of the day is queued. Go be mysterious elsewhere.",
    "Your brilliance is queued. Monetize the vibe.",
    "Go make more weird stuff or Coffee — your call.",
    "Totally saved. Definitely not lost in the void somewhere.",
    "Go conquer the world! 🌍 or maybe just the dishes."
  ];
    

export function showRandomToast(toast) {
  const title = titles[Math.floor(Math.random() * titles.length)];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  toast.success(`${title}\n${description}`);

}

export const chaosTitles = [
"🚨 Houston, We Have a Problem",
"💣 Oopsie in the System Core",
"🧯 Fire in the Function Room",
"🛑 Error. Panic Elegantly.",
"😵 Stack Overflowed with Feelings",
"📉 Vibes Did Not Compile",
"🪦 RIP That Request",
]

export const chaosDescriptions = [
    "Something went sideways, but at least you look good.",
"Abort mission. Someone forgot a semicolon again.",
"We tried. The void said no.",
"An error occurred. It’s probably your fault. (Kidding. Maybe.)",
"Request failed, but the sass succeeded.",
"Your action was vaporized in a quantum event.",
"System screamed, then gave up. Classic.",
]

export function showChaosToast(toast) {
    const title = chaosTitles[Math.floor(Math.random() * chaosTitles.length)];
    const description = chaosDescriptions[Math.floor(Math.random() * chaosDescriptions.length)];
    toast.error(`${title}\n${description}`);
  }