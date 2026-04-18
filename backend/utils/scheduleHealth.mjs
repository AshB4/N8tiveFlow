import { isApprovedStatus } from "./postStatus.mjs";

const DEFAULT_TIMEZONE =
	process.env.POSTPUNK_SCHEDULE_TIMEZONE || process.env.TZ || "America/Chicago";

function toDate(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function dayFormatter(timezone = DEFAULT_TIMEZONE) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

function keyForDate(date, timezone = DEFAULT_TIMEZONE) {
	return dayFormatter(timezone).format(date);
}

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function getScheduleTimezone() {
	return DEFAULT_TIMEZONE;
}

export function buildScheduleHealth(posts = [], options = {}) {
	const timezone = options.timezone || DEFAULT_TIMEZONE;
	const nowMs = Number(options.nowMs || Date.now());
	const lookaheadDays = Math.max(1, Number(options.lookaheadDays || 3));
	const approvedScheduled = posts
		.filter((post) => isApprovedStatus(post?.status))
		.map((post) => ({
			post,
			when: toDate(post?.scheduledAt ?? post?.scheduled_at),
		}))
		.filter((entry) => entry.when);

	const scheduledCounts = new Map();
	for (const entry of approvedScheduled) {
		const dayKey = keyForDate(entry.when, timezone);
		scheduledCounts.set(dayKey, (scheduledCounts.get(dayKey) || 0) + 1);
	}

	const now = new Date(nowMs);
	const todayKey = keyForDate(now, timezone);
	const gapDays = [];
	for (let offset = 0; offset < lookaheadDays; offset += 1) {
		const day = addDays(now, offset);
		const dayKey = keyForDate(day, timezone);
		if ((scheduledCounts.get(dayKey) || 0) === 0) {
			gapDays.push(dayKey);
		}
	}

	const nextScheduled = approvedScheduled
		.map((entry) => entry.when)
		.filter((when) => when.getTime() >= nowMs)
		.sort((a, b) => a - b)[0];

	const overdueApprovedCount = approvedScheduled.filter(
		(entry) => entry.when.getTime() < nowMs,
	).length;

	return {
		timezone,
		todayKey,
		todayScheduledCount: scheduledCounts.get(todayKey) || 0,
		gapDays,
		nextScheduled: nextScheduled ? nextScheduled.toISOString() : null,
		overdueApprovedCount,
	};
}
