export function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function buildAnalyticsSummary(events = [], storedSummary = {}) {
  const safeEvents = Array.isArray(events) ? events : [];

  const totals = safeEvents.reduce(
    (acc, event) => {
      acc.clicks += toNumber(event.clicks);
      acc.likes += toNumber(event.likes);
      acc.signups += toNumber(event.signups);
      acc.conversions += toNumber(event.conversions);
      acc.saves += toNumber(event.saves);
      acc.retweets += toNumber(event.retweets);
      return acc;
    },
    { clicks: 0, likes: 0, signups: 0, conversions: 0, saves: 0, retweets: 0 },
  );

  const platformMap = new Map();
  const campaignMap = new Map();

  for (const event of safeEvents) {
    const platform = String(event.platform || "unknown");
    const campaign = String(event.campaign || "uncategorized");
    const platformEntry = platformMap.get(platform) || {
      platform,
      clicks: 0,
      likes: 0,
      signups: 0,
      conversions: 0,
      saves: 0,
      retweets: 0,
      posts: 0,
    };
    const campaignEntry = campaignMap.get(campaign) || {
      campaign,
      platform,
      clicks: 0,
      likes: 0,
      signups: 0,
      conversions: 0,
      saves: 0,
      retweets: 0,
      posts: 0,
      timestamp: event.timestamp || null,
    };

    for (const metric of ["clicks", "likes", "signups", "conversions", "saves", "retweets"]) {
      platformEntry[metric] += toNumber(event[metric]);
      campaignEntry[metric] += toNumber(event[metric]);
    }

    platformEntry.posts += 1;
    campaignEntry.posts += 1;
    campaignEntry.timestamp = event.timestamp || campaignEntry.timestamp;

    platformMap.set(platform, platformEntry);
    campaignMap.set(campaign, campaignEntry);
  }

  const platforms = [...platformMap.values()].sort((a, b) => b.clicks - a.clicks);
  const campaigns = [...campaignMap.values()].sort((a, b) => b.clicks - a.clicks);

  return {
    totals,
    topPlatform: platforms[0] || null,
    topCampaign: campaigns[0] || null,
    platforms,
    campaigns,
    recentEvents: [...safeEvents]
      .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
      .slice(0, 10),
    posting: {
      totalAttempted: toNumber(storedSummary.total_posts_attempted),
      totalSuccessful: toNumber(storedSummary.total_posts_successful),
      successRate: toNumber(storedSummary.success_rate),
      totalRejected: toNumber(storedSummary.total_rejected),
      mostActiveDay: storedSummary.most_active_day || null,
      lastUpdated: storedSummary.last_updated || null,
    },
  };
}
