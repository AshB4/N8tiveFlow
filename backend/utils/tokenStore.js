/**
 * Simple in-memory refresh token store.
 * Replace with persistent storage (database/cache) as needed.
 */

const refreshTokens = new Set();

export function addToken(token) {
	if (token) {
		refreshTokens.add(token);
	}
}

export function hasToken(token) {
	return refreshTokens.has(token);
}

export function deleteToken(token) {
	refreshTokens.delete(token);
}

export function clearTokens() {
	refreshTokens.clear();
}

export function listTokens() {
	return Array.from(refreshTokens);
}
