import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./authRoutes.js";
import studentRoutes from "./studentRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Student API is running" });
});

app.use("/auth", authRoutes);
app.use("/students", studentRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);

    if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "That email is already registered or in use." });
    }

    res.status(500).json({ message: "Internal server error" });
});

export default app;
