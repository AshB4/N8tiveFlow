/**
 * Simple in-memory refresh token store.
 * Replace with persistent storage (database/cache) as needed.
 */

const refreshTokens = new Set();

module.exports = {
        add(token) {
                if (token) {
                        refreshTokens.add(token);
                }
        },
        has(token) {
                return refreshTokens.has(token);
        },
        delete(token) {
                refreshTokens.delete(token);
        },
        clear() {
                refreshTokens.clear();
        },
        values() {
                return Array.from(refreshTokens);
        },
};
