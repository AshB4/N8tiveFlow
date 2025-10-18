const express = require("express");
const jwt = require("jsonwebtoken");
const tokenStore = require("../utils/tokenStore");

const router = express.Router();

const users = new Map();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

function createTokens(username) {
        const payload = { username };
        const accessToken = jwt.sign(payload, ACCESS_SECRET, {
                expiresIn: ACCESS_EXPIRES_IN,
        });
        const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
                expiresIn: REFRESH_EXPIRES_IN,
        });

        tokenStore.add(refreshToken);

        return { accessToken, refreshToken };
}

router.post("/register", (req, res) => {
        const { username, password } = req.body || {};

        if (!username || !password) {
                return res
                        .status(400)
                        .json({ message: "Username and password are required" });
        }

        if (users.has(username)) {
                return res.status(409).json({ message: "User already exists" });
        }

        users.set(username, { username, password });

        return res.status(201).json({ message: "User registered" });
});

router.post("/login", (req, res) => {
        const { username, password } = req.body || {};

        if (!username || !password) {
                return res
                        .status(400)
                        .json({ message: "Username and password are required" });
        }

        const user = users.get(username);

        if (!user || user.password !== password) {
                return res.status(401).json({ message: "Invalid credentials" });
        }

        const tokens = createTokens(username);

        return res.json(tokens);
});

router.post("/refresh", (req, res) => {
        const { refreshToken } = req.body || {};

        if (!refreshToken) {
                return res.status(400).json({ message: "Refresh token is required" });
        }

        if (!tokenStore.has(refreshToken)) {
                return res.status(401).json({ message: "Refresh token not recognized" });
        }

        try {
                const payload = jwt.verify(refreshToken, REFRESH_SECRET);
                tokenStore.delete(refreshToken);
                const tokens = createTokens(payload.username);
                return res.json(tokens);
        } catch (error) {
                tokenStore.delete(refreshToken);
                return res.status(401).json({ message: "Invalid or expired refresh token" });
        }
});

router.post("/logout", (req, res) => {
        const { refreshToken } = req.body || {};

        if (!refreshToken) {
                return res.status(400).json({ message: "Refresh token is required" });
        }

        tokenStore.delete(refreshToken);

        return res.json({ message: "Logged out" });
});

module.exports = router;
