const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";

module.exports = function authenticate(req, res, next) {
        const authHeader = req.headers.authorization || "";
        const [, token] = authHeader.split(" ");

        if (!token) {
                return res.status(401).json({ message: "Missing access token" });
        }

        try {
                const payload = jwt.verify(token, ACCESS_SECRET);
                req.user = payload;
                return next();
        } catch (error) {
                return res.status(401).json({ message: "Invalid or expired access token" });
        }
};
