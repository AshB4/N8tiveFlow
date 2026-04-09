# Platform Health UX Plan

This is the implementation plan for making platform/account health visible inside
the composer.

## User Problem

Users currently see platforms as selectable if they are configured, even when the
real token is expired, incomplete, or otherwise unusable.

That creates two bad outcomes:

- wasted posting attempts
- no clear explanation of why a platform failed

## Desired UX

### In the composer

- each platform row should show a status dot or badge
- failed platforms should be grayed out by default
- hover or click should show exact reason
- account-level targets should inherit the account health, not just the platform label

### Status mapping

- healthy: green
- warning: amber
- error: red/dimmed
- unknown: muted gray

### Error detail examples

- `Expired token`
- `OAuthException 190`
- `subcode 463`
- `Missing account id`
- `Missing access token`
- `Rate limited`
- `API unavailable`

## Backend requirements

Create a dedicated API response for the frontend, derived from the live health check:

```json
{
  "checkedAt": "2026-03-14T21:41:46.000Z",
  "results": [
    {
      "platform": "facebook",
      "accountId": "fb-main-profile",
      "status": "error",
      "summary": "Expired token",
      "detail": "Error validating access token: Session has expired...",
      "errorCode": 190,
      "errorSubcode": 463
    }
  ]
}
```

## Frontend requirements

- fetch health on composer load
- cache short-term results to avoid hitting every provider too often
- allow manual refresh
- disable submit against `error` accounts by default
- allow optional override only if you intentionally decide to support that

## Recommended parsing rules

From known provider errors:

- if detail contains `expired` -> summary `Expired token`
- if detail contains `missing` -> summary `Missing credentials`
- if detail contains `503` or `unavailable` -> summary `Provider unavailable`
- if detail contains `rate limit` or `429` -> summary `Rate limited`

Also extract numeric codes when present:

- Facebook / Instagram Graph errors often include `code` and `error_subcode`
- preserve both in the API response

## Rollout order

Current state:

1. Backend health endpoint exists at `/api/platform-health`.
2. `/setup` already uses platform/account health visibility.
3. Composer-facing health UX is still only partially aligned with this plan.

Remaining work:

1. make composer account/target rows show status directly
2. add clearer click-to-explain detail in the composer itself
3. decide whether error-state lanes should be hard-blocked or manually overridable
4. keep the health view separate from schedule-integrity checks, because a healthy lane does not mean the queue actually has posts due
