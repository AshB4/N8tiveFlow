export function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizePinterestMetrics(snapshot = {}) {
  const metrics = snapshot.metrics && typeof snapshot.metrics === "object" ? snapshot.metrics : {};
  return {
    impressions: toNumber(metrics.impressions),
    saves: toNumber(metrics.saves),
    pinClicks: toNumber(metrics.pinClicks ?? metrics.pin_clicks),
    outboundClicks: toNumber(metrics.outboundClicks ?? metrics.outbound_clicks),
  };
}

function scorePinterestSnapshot(snapshot = {}) {
  const metrics = normalizePinterestMetrics(snapshot);
  return (metrics.outboundClicks * 5) + (metrics.pinClicks * 3) + (metrics.saves * 2) + (metrics.impressions * 0.5);
}

export function buildPinterestSnapshotSummary(snapshots = []) {
  const safeSnapshots = Array.isArray(snapshots) ? snapshots : [];
  const normalized = safeSnapshots.map((snapshot) => {
    const metrics = normalizePinterestMetrics(snapshot);
    return {
      pinId: snapshot.pinId || null,
      pinUrl: snapshot.pinUrl || null,
      title: snapshot.titleSeen || snapshot.title || snapshot.pinId || "Untitled pin",
      capturedAt: snapshot.capturedAt || null,
      captureMethod: snapshot.captureMethod || null,
      confidence: snapshot.confidence ?? null,
      ...metrics,
      score: scorePinterestSnapshot(snapshot),
    };
  });

  const totals = normalized.reduce(
    (acc, item) => {
      acc.impressions += item.impressions;
      acc.saves += item.saves;
      acc.pinClicks += item.pinClicks;
      acc.outboundClicks += item.outboundClicks;
      acc.score += item.score;
      return acc;
    },
    { impressions: 0, saves: 0, pinClicks: 0, outboundClicks: 0, score: 0 },
  );

  const topPins = [...normalized]
    .sort((a, b) => b.score - a.score || b.outboundClicks - a.outboundClicks || b.pinClicks - a.pinClicks)
    .slice(0, 5);

  return {
    totals,
    topPins,
    recentSnapshots: [...normalized]
      .sort((a, b) => String(b.capturedAt || "").localeCompare(String(a.capturedAt || "")))
      .slice(0, 10),
    count: normalized.length,
  };
}

export function buildAnalyticsSummary(events = [], storedSummary = {}, pinterestSnapshots = []) {
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
    pinterest: buildPinterestSnapshotSummary(pinterestSnapshots),
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
