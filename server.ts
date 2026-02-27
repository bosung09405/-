import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("evaluations.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating INTEGER,
    message TEXT,
    user_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/evaluations", (req, res) => {
    const { rating, message, userEmail } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO evaluations (rating, message, user_email) VALUES (?, ?, ?)");
      stmt.run(rating, message, userEmail);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save evaluation" });
    }
  });

  app.get("/api/evaluations", (req, res) => {
    // In a real app, we'd check authentication here.
    // For this app, we'll let the client handle the admin check based on email.
    try {
      const evaluations = db.prepare("SELECT * FROM evaluations ORDER BY created_at DESC").all();
      res.json(evaluations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch evaluations" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
