const express = require("express");
const rateLimit = require("express-rate-limit");
const { pool, initDb } = require("./db");

const app = express();
app.set("trust proxy", 1); // real client IP behind Dockhold's edge (for rate limiting)
app.use(express.json({ limit: "10kb" }));

// Rate-limit writes per IP so the open endpoints can't be flooded.
const writeLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.get("/", (_req, res) =>
  res.json({
    message: "Postgres starter — a CRUD API on the managed database.",
    routes: ["GET /api/items", "GET /api/items/:id", "POST /api/items", "PATCH /api/items/:id", "DELETE /api/items/:id"],
    docs: "https://dockhold.eu/docs/recipes/connect-a-postgres-database",
  })
);
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// List items, newest first.
app.get("/api/items", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, title, done, created_at FROM items ORDER BY created_at DESC LIMIT 200");
    res.json(rows);
  } catch (err) {
    console.error("list failed", err);
    res.status(500).json({ error: "could not read items" });
  }
});

// Get one item.
app.get("/api/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "id must be an integer" });
  try {
    const { rows } = await pool.query("SELECT id, title, done, created_at FROM items WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("get failed", err);
    res.status(500).json({ error: "could not read item" });
  }
});

// Create an item. Parameterized query — never interpolate user input.
app.post("/api/items", writeLimiter, async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) return res.status(400).json({ error: "title is required" });
  if (title.length > 200) return res.status(400).json({ error: "title too long (max 200)" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO items (title) VALUES ($1) RETURNING id, title, done, created_at",
      [title]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("insert failed", err);
    res.status(500).json({ error: "could not create item" });
  }
});

// Update an item's title and/or done flag.
app.patch("/api/items/:id", writeLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "id must be an integer" });
  const { title, done } = req.body ?? {};
  if (title !== undefined && (typeof title !== "string" || !title.trim() || title.length > 200))
    return res.status(400).json({ error: "title must be a non-empty string (max 200)" });
  if (done !== undefined && typeof done !== "boolean")
    return res.status(400).json({ error: "done must be a boolean" });
  try {
    const { rows } = await pool.query(
      `UPDATE items SET
         title = COALESCE($2, title),
         done = COALESCE($3, done)
       WHERE id = $1
       RETURNING id, title, done, created_at`,
      [id, title?.trim() ?? null, done ?? null]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("update failed", err);
    res.status(500).json({ error: "could not update item" });
  }
});

// Delete an item.
app.delete("/api/items/:id", writeLimiter, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "id must be an integer" });
  try {
    const { rowCount } = await pool.query("DELETE FROM items WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    console.error("delete failed", err);
    res.status(500).json({ error: "could not delete item" });
  }
});

const port = process.env.PORT || 3000;
initDb()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`listening on ${port}`)))
  .catch((err) => {
    console.error("db init failed", err);
    process.exit(1);
  });
