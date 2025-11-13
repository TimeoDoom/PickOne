import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Connexion à Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log("Connecté à la base de données Neon"))
  .catch((err) => console.error("Erreur de connexion :", err));

// #############################
// --- ROUTES ---
// #############################

// Vérification API
// app.get("/", (req, res) => {
//   res.send("API PickOne en ligne !");
// });

// Récupérer tous les paris
app.get("/api/paris", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pari ORDER BY creationDate DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des paris" });
  }
});

// Créer un nouveau pari
app.post("/api/paris", async (req, res) => {
  try {
    const { title, description, deadline, optionA, optionB, creatorId } =
      req.body;
    const result = await pool.query(
      `INSERT INTO pari (title, description, deadline, optionA, optionB, creatorId)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, deadline, optionA, optionB, creatorId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création du pari" });
  }
});

// Lancer le serveur
app.listen(port, () => {
  console.log(`Serveur en ligne sur http://localhost:${port}`);
});
