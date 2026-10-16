import express from "express";
import "dotenv/config";
import pool from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

function validEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/register", async (req, res, next) => {
    try {
        const { name, email, password } = req.body ?? {};

        if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ message: "Name must be between 2 and 100 characters." });
        }
        if (!validEmail(email)) {
            return res.status(400).json({ message: "Enter a valid email address." });
        }
        if (typeof password !== "string" || password.length < 8 || password.length > 72) {
            return res.status(400).json({ message: "Password must be 8–72 characters." });
        }

        const [existing] = await pool.execute("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]);
        if (existing.length) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name.trim(), email.trim().toLowerCase(), hashedPassword]
        );

        return res.status(201).json({ message: "Account created. You can now log in." });
    } catch (error) {
        next(error);
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body ?? {};

        if (!validEmail(email) || typeof password !== "string") {
            return res.status(400).json({ message: "Enter your email and password." });
        }

        const [rows] = await pool.execute(
            "SELECT id, name, email, password FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = rows[0];
        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "Login successful.",
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
