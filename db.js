import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "node:fs";

const ca = process.env.DB_CA_CERT;
const required = ["DB_HOST", "DB_USER", "DB_NAME"];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === "true"
    ? { ca, rejectUnauthorized: true }
    : undefined
});

export default pool;
