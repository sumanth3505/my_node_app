import express from "express";
import pool from "./db.js";
import verifyToken from "./authMiddleware.js";

const router = express.Router();
router.use(verifyToken);

function validateStudent(body) {
    const { name, email, department, marks } = body ?? {};
    const numericMarks = Number(marks);

    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
        return "Name is required (maximum 100 characters).";
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Enter a valid student email.";
    }
    if (typeof department !== "string" || !department.trim() || department.trim().length > 100) {
        return "Department is required (maximum 100 characters).";
    }
    if (marks === "" || marks === undefined || marks === null || !Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > 100) {
        return "Marks must be a number between 0 and 100.";
    }

    return null;
}

function studentValues(body) {
    return [
        body.name.trim(),
        body.email.trim().toLowerCase(),
        body.department.trim(),
        Number(body.marks)
    ];
}

// GET /students — list all students
router.get("/", async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            "SELECT id, name, email, department, marks, created_at FROM students ORDER BY id DESC"
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// GET /students/:id — get one student
router.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ message: "Invalid student ID." });
        }

        const [rows] = await pool.execute(
            "SELECT id, name, email, department, marks, created_at FROM students WHERE id = ?",
            [id]
        );
        if (!rows.length) return res.status(404).json({ message: "Student not found." });
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// POST /students — add a student
router.post("/", async (req, res, next) => {
    try {
        const validationError = validateStudent(req.body);
        if (validationError) return res.status(400).json({ message: validationError });

        const [result] = await pool.execute(
            "INSERT INTO students (name, email, department, marks) VALUES (?, ?, ?, ?)",
            studentValues(req.body)
        );
        res.status(201).json({ id: result.insertId, message: "Student added successfully." });
    } catch (error) {
        next(error);
    }
});

// PUT /students/:id — update a student
router.put("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ message: "Invalid student ID." });
        }

        const validationError = validateStudent(req.body);
        if (validationError) return res.status(400).json({ message: validationError });

        const [result] = await pool.execute(
            "UPDATE students SET name = ?, email = ?, department = ?, marks = ? WHERE id = ?",
            [...studentValues(req.body), id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
        res.json({ message: "Student updated successfully." });
    } catch (error) {
        next(error);
    }
});

// DELETE /students/:id — delete a student
router.delete("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ message: "Invalid student ID." });
        }

        const [result] = await pool.execute("DELETE FROM students WHERE id = ?", [id]);
        if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
        res.json({ message: "Student deleted successfully." });
    } catch (error) {
        next(error);
    }
});

export default router;
