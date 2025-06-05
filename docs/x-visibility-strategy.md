# Maximizing X (Twitter) Visibility in 2025 – PostPunk Strategy Layer

This guide summarizes best practices collected from research and community threads on how to boost organic reach on **X** using only free features. Use these tactics when the post metadata includes the `x-visibility` tag.

## Key Principles for 2025

- **Consistency** – Aim for **3–15 posts** per day for engagement; up to **30** for maximum reach.
- **Rich Media** – Include videos, images, or GIFs to increase dwell time and discovery potential.
- **Trends & Timing** – Post between **9 AM–12 PM** (Wednesday and Friday perform best) and leverage trending hashtags.
- **Early Engagement** – The first hour is critical for algorithmic pickup.
- **Pinned Posts** – Newly pinned content receives extra visibility for about 48 hours in the "For You" feed.
- **Spaces & Communities** – Use free tools like Spaces and Communities to extend reach within niches.

## PostPunk Implementation Ideas

1. **Content Composer**
   - Add a **Visibility Boost** option to the Remix prompt.
   - Suggest calls to action such as polls or "RT if you agree" in the opening hour.
2. **Scheduler Rules**
   - Guarantee 3–5 X posts per day when `x-visibility` is set.
   - Prioritize scheduling between **9 AM–12 PM** local time.
   - Swap pinned posts every 2–3 days automatically.
3. **Engagement Warm‑Up Bot**
   - Before posting, interact with 20–30 relevant posts to trigger early engagement.
   - Integrate this with `prePostHooks/x-engagement.js`.
4. **Post Types**
   - Support threads (up to five posts), single bold hooks, and attachments for images or videos.
   - Provide curiosity‑driven or open‑ended CTA variants.
5. **Index & Results Tracking**
   - Track dwell time and engagement metrics in `posted-log.json`.
   - Score posts by follower ratio, link placement, and CTA clicks.

## Strategy Rules at a Glance

| Category   | Strategy                       | Automation Trigger |
|------------|--------------------------------|--------------------|
| Content    | Post 3–15×/day                 | `x-visibility` tag |
| Trends     | Hashtags + hook formatting     | Remix engine       |
| Engagement | Polls, questions, strong CTAs  | Prompt scaffolding |
| Warm‑up    | Engage before posting          | `prePostHooks`     |
| Pinned     | Rotate pinned every 2–3 days   | `cron-pin-rotator` |
| Dwell      | Long threads, video embeds     | Post scoring       |
| Follower   | Maintain 2:1 follower ratio    | Logging notifier   |

## Codex Prompt Summary

When Codex generates X posts marked with `x-visibility`:

- Inject clear CTAs and schedule posts during optimal hours.
- Favor threads, rich media, and pinned content rotations.
- Run warm‑up engagement hooks before posting.
- Track dwell time and engagement to refine future weighting.

