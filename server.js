import "dotenv/config";
import app from "./app.js";
import pool from "./db.js";

const PORT = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be set to a random secret of at least 32 characters.");
    process.exit(1);
}

try {
    await pool.query("SELECT 1");
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Student app running on port ${PORT}`);
    });
} catch (error) {
    console.error("Could not connect to MySQL:", error.message);
    process.exit(1);
}
