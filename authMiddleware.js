import "dotenv/config";
import jwt from "jsonwebtoken";

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Please log in first." });
    }

    const token = authHeader.slice("Bearer ".length).trim();

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
    }
}

export default verifyToken;
